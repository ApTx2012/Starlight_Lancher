import assert from 'node:assert/strict'
import test from 'node:test'

import {
	openSkinSiteLogin,
	receiveSkinSiteMessage,
	requestSkinSiteLuck,
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
