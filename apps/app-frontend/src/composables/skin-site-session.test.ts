import assert from 'node:assert/strict'
import test from 'node:test'
import { useHostedSync } from './useHostedSync.ts'
import { useHostedCreation, forgetHostedCreation } from './useHostedCreation.ts'
import {
	clearHostedSession,
	hostedCreate,
	hostedDefault,
	hostedSync,
	onHostedPackAttemptStarted,
	setInstanceMode,
} from '../helpers/hosted-packs.ts'

import {
	openSkinSiteLogin,
	receiveSkinSiteMessage,
	requestSkinSiteLuck,
	requestSkinSiteDownloadToken,
	requestSkinSitePlayers,
	requestSkinSiteSkinUpdate,
	resetSkinSiteSession,
	setSkinSiteFrame,
	SKIN_SITE_ORIGIN,
	skinSiteFrameUrl,
	skinSitePlayers,
	skinSitePlayersStatus,
	skinSiteStatus,
	skinSiteUser,
} from './skin-site-session.ts'

test('hosted installation sends the JWT to native commands while Local needs no session', async () => {
	const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
	const calls: Array<{ command: string; args: Record<string, unknown> }> = []
	let syncResponse: (() => Promise<unknown>) | undefined
	let createdId = 'instance'
	let instanceExists = false
	let tokenRequests = 0
	const frame = {
		postMessage(data: { type: string; requestId: string }) {
			if (data.type !== 'starlight-pack-token-request') return
			tokenRequests++
			receiveSkinSiteMessage(
				{
					origin: SKIN_SITE_ORIGIN,
					source: frame,
					data: {
						type: 'starlight-pack-token-result',
						requestId: data.requestId,
						token: 'site.jwt.secret',
					},
				} as MessageEvent,
				frame,
			)
		},
	} as unknown as Window
	Object.defineProperty(globalThis, 'window', {
		configurable: true,
		value: {
			__TAURI_INTERNALS__: {
				async invoke(command: string, args: Record<string, unknown>) {
					calls.push({ command, args })
					if (command === 'plugin:install|hosted_sync' && syncResponse) return syncResponse()
					if (command === 'plugin:instance|instance_get')
						return instanceExists ? { id: args.instanceId } : null
					return command === 'plugin:install|hosted_create' ? createdId : null
				},
			},
		},
	})
	try {
		resetSkinSiteSession()
		setSkinSiteFrame(frame)
		receiveSkinSiteMessage(
			{
				origin: SKIN_SITE_ORIGIN,
				source: frame,
				data: {
					type: 'starlight-skin-session',
					status: 'signed-in',
					user: { uuid: 'site', username: 'Site' },
				},
			} as MessageEvent,
			frame,
		)
		await hostedDefault()
		assert.equal(await hostedCreate(), 'instance')
		await hostedSync('instance')
		await setInstanceMode('instance', 'starlight')
		assert.equal(tokenRequests, 4)
		assert.deepEqual(
			calls.map(({ command }) => command),
			[
				'hosted_set_session',
				'hosted_default',
				'hosted_set_session',
				'hosted_create',
				'hosted_set_session',
				'hosted_sync',
				'hosted_set_session',
				'hosted_set_instance_mode',
			].map((name) => `plugin:install|${name}`),
		)
		for (const call of calls.filter(({ command }) => command.endsWith('hosted_set_session'))) {
			assert.equal(call.args.token, 'site.jwt.secret')
		}
		let rejectSync!: (error: unknown) => void
		let syncCalls = 0
		syncResponse = () => {
			syncCalls++
			return new Promise((_, reject) => {
				rejectSync = reject
			})
		}
		const originalPage = useHostedSync(() => 'shared-progress-instance')
		const pendingSync = originalPage.sync()
		const reopenedPage = useHostedSync(() => 'shared-progress-instance')
		assert.equal(reopenedPage.busy.value, true)
		assert.equal(useHostedSync(() => 'other-instance').busy.value, false)
		await reopenedPage.sync()
		await new Promise((resolve) => setImmediate(resolve))
		assert.equal(syncCalls, 1)
		rejectSync({ message: 'download interrupted' })
		await pendingSync
		assert.equal(reopenedPage.busy.value, false)
		assert.match(reopenedPage.error.value, /download interrupted/)
		assert.equal(
			useHostedSync(() => 'shared-progress-instance').error.value,
			reopenedPage.error.value,
		)
		syncResponse = async () => ({ revision: 'new-version' })
		await reopenedPage.sync()
		assert.equal(originalPage.error.value, '')
		assert.deepEqual(originalPage.result.value, { revision: 'new-version' })

		const creation = useHostedCreation()
		createdId = 'deleted-instance'
		syncResponse = async () => {
			throw new Error('download failed')
		}
		await creation.install()
		assert.equal(creation.createdInstance.value, 'deleted-instance')
		assert.match(creation.installError.value, /download failed/)
		createdId = 'replacement-instance'
		syncResponse = async () => ({
			version: '1',
			downloadedBytes: 0,
			changedFiles: 0,
			preservedFiles: [],
		})
		const retryCallStart = calls.length
		assert.equal(await creation.install(), 'replacement-instance')
		assert.equal(calls[retryCallStart].command, 'plugin:instance|instance_get')
		assert.equal(
			calls.filter((call) => call.command.endsWith('|hosted_sync')).at(-1)?.args.instanceId,
			'replacement-instance',
		)
		assert.equal(creation.installError.value, '')
		forgetHostedCreation('unrelated-instance')
		assert.equal(creation.completed.value, true)
		forgetHostedCreation('replacement-instance')
		assert.equal(creation.createdInstance.value, undefined)
		assert.equal(creation.completed.value, false)
		createdId = 'third-instance'
		syncResponse = () =>
			new Promise((_, reject) => {
				rejectSync = reject
			})
		const deletedDuringSync = creation.install()
		await new Promise((resolve) => setImmediate(resolve))
		forgetHostedCreation('third-instance')
		rejectSync(new Error('Unknown instance'))
		await deletedDuringSync
		assert.equal(creation.installError.value, '')
		assert.equal(creation.createdInstance.value, undefined)
		createdId = 'existing-instance'
		syncResponse = async () => {
			throw new Error('download interrupted')
		}
		await creation.install()
		instanceExists = true
		syncResponse = async () => ({
			version: '1',
			downloadedBytes: 0,
			changedFiles: 0,
			preservedFiles: [],
		})
		const createCount = calls.filter((call) => call.command.endsWith('|hosted_create')).length
		assert.equal(await creation.install(), 'existing-instance')
		assert.equal(
			calls.filter((call) => call.command.endsWith('|hosted_create')).length,
			createCount,
		)
		creation.acknowledge('existing-instance')
		const requestsBeforeLogout = tokenRequests
		resetSkinSiteSession()
		await clearHostedSession()
		assert.equal(calls.at(-1)!.args.token, null)
		await setInstanceMode('instance', 'local')
		assert.equal(tokenRequests, requestsBeforeLogout)
		const attempts: string[] = []
		const stopListening = onHostedPackAttemptStarted((id) => attempts.push(id))
		const unauthenticatedRetry = hostedSync('failed-instance')
		assert.deepEqual(attempts, ['failed-instance'])
		await assert.rejects(unauthenticatedRetry)
		stopListening()
		await assert.rejects(hostedSync('failed-instance'))
		assert.equal(attempts.length, 1)
		await assert.rejects(hostedCreate(), /无需选择玩家/)
	} finally {
		resetSkinSiteSession()
		setSkinSiteFrame(null)
		if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
		else Reflect.deleteProperty(globalThis, 'window')
	}
})

test('pack download gets the site JWT without choosing a player and rejects stale replies', async () => {
	const sent: Array<{ type: string; requestId: string }> = []
	const frame = {
		postMessage(data: { type: string; requestId: string }) {
			sent.push(data)
		},
	} as unknown as Window
	const receive = (data: unknown, origin = SKIN_SITE_ORIGIN) =>
		receiveSkinSiteMessage(
			{
				origin,
				source: frame,
				data,
			} as MessageEvent,
			frame,
		)
	resetSkinSiteSession()
	setSkinSiteFrame(frame)
	await assert.rejects(requestSkinSiteDownloadToken(), /无需选择玩家/)
	receive({
		type: 'starlight-skin-session',
		status: 'signed-in',
		user: { uuid: 'site-user', username: 'Site' },
	})
	const token = requestSkinSiteDownloadToken()
	const requestId = sent.at(-1)!.requestId
	const reply = { type: 'starlight-pack-token-result', requestId, token: 'site.jwt.secret' }
	assert.equal(receive(reply, 'https://evil.example'), false)
	assert.equal(receive(reply), true)
	assert.equal(await token, 'site.jwt.secret')
	assert.equal(skinSitePlayers.value.length, 0)
	assert.equal(JSON.stringify(skinSiteUser.value).includes('secret'), false)
	const stale = requestSkinSiteDownloadToken()
	const staleId = sent.at(-1)!.requestId
	const rejected = assert.rejects(stale, /登录状态已变化/)
	resetSkinSiteSession()
	await rejected
	assert.equal(receive({ ...reply, requestId: staleId }), false)
	setSkinSiteFrame(null)
})

test('skin site session accepts only the embedded origin and window, and redirects after verification', () => {
	const frame = {} as Window
	const message = (status: string, user?: unknown) =>
		({
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: { type: 'starlight-skin-session', status, user },
		}) as MessageEvent
	resetSkinSiteSession()
	openSkinSiteLogin()
	assert.equal(skinSiteFrameUrl.value, `${SKIN_SITE_ORIGIN}/login`)
	const signedIn = message('signed-in', {
		uuid: 'test-user',
		username: '测试用户',
		jwt: 'must-not-copy',
	})
	assert.equal(
		receiveSkinSiteMessage({ ...signedIn, origin: 'https://evil.example' } as MessageEvent, frame),
		false,
	)
	assert.equal(receiveSkinSiteMessage(signedIn, {} as Window), false)
	assert.equal(receiveSkinSiteMessage(message('signed-in', {}), frame), false)
	assert.equal(skinSiteUser.value, null)
	assert.equal(receiveSkinSiteMessage(signedIn, frame), true)
	assert.deepEqual(skinSiteUser.value, { uuid: 'test-user', username: '测试用户' })
	assert.equal(skinSiteStatus.value, 'signed-in')
	assert.equal(skinSiteFrameUrl.value, `${SKIN_SITE_ORIGIN}/profile`)
	assert.equal(receiveSkinSiteMessage(message('checking'), frame), true)
	assert.equal(skinSiteUser.value, null)
	receiveSkinSiteMessage(message('signed-in', { uuid: 'second', username: '另一个账号' }), frame)
	assert.deepEqual(skinSiteUser.value, { uuid: 'second', username: '另一个账号' })
	receiveSkinSiteMessage(message('signed-out'), frame)
	assert.equal(skinSiteUser.value, null)
	assert.equal(skinSiteStatus.value, 'signed-out')
	receiveSkinSiteMessage(message('error'), frame)
	assert.equal(skinSiteStatus.value, 'error')
	resetSkinSiteSession()
})

test('luck requests use only the connected skin site frame and validate its result', async () => {
	const sent: Array<{ data: unknown; targetOrigin: string }> = []
	const frame = {
		postMessage(data: unknown, targetOrigin: string) {
			sent.push({ data, targetOrigin })
		},
	} as unknown as Window
	const sessionMessage = {
		origin: SKIN_SITE_ORIGIN,
		source: frame,
		data: {
			type: 'starlight-skin-session',
			status: 'signed-in',
			user: { uuid: 'lucky-user', username: 'Lucky' },
		},
	} as MessageEvent

	resetSkinSiteSession()
	setSkinSiteFrame(frame)
	receiveSkinSiteMessage(sessionMessage, frame)
	const automaticPlayersRequest = sent.at(-1)?.data as { type: string; requestId: string }
	assert.equal(automaticPlayersRequest.type, 'starlight-skin-players-request')
	receiveSkinSiteMessage(
		{
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: {
				type: 'starlight-skin-players-result',
				requestId: automaticPlayersRequest.requestId,
				ok: true,
				players: [],
			},
		} as MessageEvent,
		frame,
	)
	const result = requestSkinSiteLuck()
	assert.equal(sent.at(-1)?.targetOrigin, SKIN_SITE_ORIGIN)
	const request = sent.at(-1)?.data as { type: string; requestId: string }
	assert.equal(request.type, 'starlight-skin-luck-request')
	assert.match(request.requestId, /^skin-luck-\d+-\d+$/)
	assert.equal(
		receiveSkinSiteMessage(
			{
				origin: SKIN_SITE_ORIGIN,
				source: frame,
				data: {
					type: 'starlight-skin-luck-result',
					requestId: request.requestId,
					ok: true,
					luck: 88,
				},
			} as MessageEvent,
			frame,
		),
		true,
	)
	assert.equal(await result, 88)
	setSkinSiteFrame(null)
	resetSkinSiteSession()
})

test('player requests validate identities and replace the collection atomically', async () => {
	const sent: Array<{ data: unknown; targetOrigin: string }> = []
	const frame = {
		postMessage(data: unknown, targetOrigin: string) {
			sent.push({ data, targetOrigin })
		},
	} as unknown as Window

	resetSkinSiteSession()
	setSkinSiteFrame(frame)
	receiveSkinSiteMessage(
		{
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: {
				type: 'starlight-skin-session',
				status: 'signed-in',
				user: { uuid: 'skin-user', username: 'Skin User' },
			},
		} as MessageEvent,
		frame,
	)
	const automaticRequest = sent.at(-1)?.data as { requestId: string }
	assert.equal(skinSitePlayersStatus.value, 'checking')
	assert.equal(
		receiveSkinSiteMessage(
			{
				origin: SKIN_SITE_ORIGIN,
				source: frame,
				data: {
					type: 'starlight-skin-players-result',
					requestId: automaticRequest.requestId,
					ok: true,
					players: [
						{
							uuid: '0123456789abcdef0123456789abcdef',
							name: 'PlayerOne',
							isMojang: false,
							skinState: 'ready',
							headDataUrl: 'data:image/png;base64,SEVBRERBVEE=',
							skinDataUrl: 'data:image/png;base64,SEVBRERBVEE=',
							model: 'slim',
						},
						{
							uuid: 'fedcba9876543210fedcba9876543210',
							name: 'NoSkinPlayer',
							isMojang: false,
							skinState: 'empty',
						},
						{ uuid: 'invalid', name: 'Ignored', isMojang: false },
					],
				},
			} as MessageEvent,
			frame,
		),
		true,
	)
	assert.deepEqual(skinSitePlayers.value, [
		{
			uuid: '0123456789abcdef0123456789abcdef',
			name: 'PlayerOne',
			isMojang: false,
			skinState: 'ready',
			headDataUrl: 'data:image/png;base64,SEVBRERBVEE=',
			skinDataUrl: 'data:image/png;base64,SEVBRERBVEE=',
			model: 'slim',
		},
		{
			uuid: 'fedcba9876543210fedcba9876543210',
			name: 'NoSkinPlayer',
			isMojang: false,
			skinState: 'empty',
		},
	])
	assert.equal(skinSitePlayersStatus.value, 'ready')

	const transientFailure = requestSkinSitePlayers()
	const transientFailureRequest = sent.at(-1)?.data as { requestId: string }
	receiveSkinSiteMessage(
		{
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: {
				type: 'starlight-skin-players-result',
				requestId: transientFailureRequest.requestId,
				ok: true,
				players: [
					{
						uuid: '0123456789abcdef0123456789abcdef',
						name: 'PlayerOne Renamed',
						isMojang: false,
						skinState: 'error',
					},
				],
			},
		} as MessageEvent,
		frame,
	)
	assert.equal((await transientFailure)[0].skinState, 'ready')
	assert.equal(skinSitePlayers.value[0].name, 'PlayerOne Renamed')
	assert.equal(skinSitePlayers.value[0].headDataUrl, 'data:image/png;base64,SEVBRERBVEE=')

	const retry = requestSkinSitePlayers()
	const retryRequest = sent.at(-1)?.data as { requestId: string }
	receiveSkinSiteMessage(
		{
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: {
				type: 'starlight-skin-players-result',
				requestId: retryRequest.requestId,
				ok: true,
				players: [],
			},
		} as MessageEvent,
		frame,
	)
	assert.deepEqual(await retry, [])
	assert.deepEqual(skinSitePlayers.value, [])
	setSkinSiteFrame(null)
	resetSkinSiteSession()
})

test('skin updates are restricted to known non-Mojang players and validated results', async () => {
	const sent: Array<{ data: unknown; targetOrigin: string }> = []
	const frame = {
		postMessage(data: unknown, targetOrigin: string) {
			sent.push({ data, targetOrigin })
		},
	} as unknown as Window

	resetSkinSiteSession()
	setSkinSiteFrame(frame)
	receiveSkinSiteMessage(
		{
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: {
				type: 'starlight-skin-session',
				status: 'signed-in',
				user: { uuid: 'skin-user', username: 'Skin User' },
			},
		} as MessageEvent,
		frame,
	)
	const automaticRequest = sent.at(-1)?.data as { requestId: string }
	receiveSkinSiteMessage(
		{
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: {
				type: 'starlight-skin-players-result',
				requestId: automaticRequest.requestId,
				ok: true,
				players: [
					{
						uuid: '0123456789abcdef0123456789abcdef',
						name: 'PlayerOne',
						isMojang: false,
						skinState: 'empty',
					},
				],
			},
		} as MessageEvent,
		frame,
	)

	const result = requestSkinSiteSkinUpdate(
		'0123456789abcdef0123456789abcdef',
		'data:image/png;base64,SEVBRERBVEE=',
		'slim',
	)
	const request = sent.at(-1)?.data as { type: string; requestId: string; playerId: string }
	assert.equal(request.type, 'starlight-skin-update-request')
	assert.equal(request.playerId, '0123456789abcdef0123456789abcdef')
	receiveSkinSiteMessage(
		{
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: { type: 'starlight-skin-update-result', requestId: request.requestId, ok: true },
		} as MessageEvent,
		frame,
	)
	await result
	await assert.rejects(
		requestSkinSiteSkinUpdate(
			'fedcba9876543210fedcba9876543210',
			'data:image/png;base64,SEVBRERBVEE=',
			'default',
		),
	)
	setSkinSiteFrame(null)
	resetSkinSiteSession()
})
