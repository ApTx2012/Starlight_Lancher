import assert from 'node:assert/strict'
import test from 'node:test'
import { useNetworkStatus } from '../composables/useNetworkStatus.ts'
import {
	setSkinSiteFrame,
	resetSkinSiteSession,
	receiveSkinSiteMessage,
	SKIN_SITE_ORIGIN,
} from '../composables/skin-site-session.ts'
import {
	prepareInstancePlayer,
	registerInstancePlayerPicker,
	saveInstancePlayer,
	onInstancePlayerChanged,
	type InstancePlayer,
} from './instance-player.ts'

test('instance player selection persists independently from the globally selected account', async () => {
	const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
	Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
	useNetworkStatus().refreshBrowserOffline()
	const saved: InstancePlayer = { id: 'saved', name: 'Saved', account_type: 'microsoft' }
	let binding: InstancePlayer | null = saved
	let accounts = [
		{ profile: { id: 'other', name: 'Other' }, account_type: 'microsoft' },
		{ profile: { id: 'saved', name: 'Saved' }, account_type: 'microsoft' },
	]
	const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
	Object.defineProperty(globalThis, 'window', {
		configurable: true,
		value: {
			__TAURI_INTERNALS__: {
				invoke: async (command: string) => {
					if (command === 'plugin:auth|get_instance_player') return binding
					if (command === 'plugin:auth|get_users') return accounts
					throw new Error(`Unexpected command ${command}`)
				},
			},
		},
	})
	const requests: Array<InstancePlayer | null> = []
	const unregister = registerInstancePlayerPicker(async (_id, locked) => {
		requests.push(locked)
		binding = saved
		return saved
	})
	try {
		setSkinSiteFrame({ postMessage() {} } as unknown as Window)
		await prepareInstancePlayer('instance')
		assert.equal(requests.length, 0)
		setSkinSiteFrame(null)
		binding = null
		await Promise.all([prepareInstancePlayer('instance'), prepareInstancePlayer('instance')])
		assert.deepEqual(requests, [null])
		await prepareInstancePlayer('instance')
		assert.equal(requests.length, 1)
		accounts = accounts.filter((account) => account.profile.id !== saved.id)
		await prepareInstancePlayer('instance')
		assert.equal(
			requests[1],
			saved,
			'Missing saved player must remain locked, not fall back to the other account',
		)
	} finally {
		unregister()
		if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
		else Reflect.deleteProperty(globalThis, 'navigator')
		if (previous) Object.defineProperty(globalThis, 'window', previous)
		else Reflect.deleteProperty(globalThis, 'window')
	}
})

test('signed-in skin site renews the saved player without prompting and only notifies after saving', async () => {
	const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
	const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
	Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
	useNetworkStatus().refreshBrowserOffline()
	const player: InstancePlayer = {
		id: '12345678-1234-1234-1234-123456789abc',
		name: 'Skin',
		account_type: 'yggdrasil',
		skin_site_user: 'owner',
	}
	const calls: string[] = []
	let failSave = false
	const frame = {
		postMessage(data: { type: string; requestId: string }) {
			if (data.type === 'starlight-pack-token-request')
				receiveSkinSiteMessage(
					{
						origin: SKIN_SITE_ORIGIN,
						source: frame,
						data: {
							type: 'starlight-pack-token-result',
							requestId: data.requestId,
							token: 'fixture.jwt',
						},
					} as unknown as MessageEvent,
					frame,
				)
		},
	} as unknown as Window
	Object.defineProperty(globalThis, 'window', {
		configurable: true,
		value: {
			__TAURI_INTERNALS__: {
				async invoke(command: string, args: Record<string, unknown>) {
					calls.push(command)
					if (command.endsWith('get_instance_player')) return player
					if (command.endsWith('login_skin_site_player')) {
						assert.equal(args.playerId, player.id)
						assert.equal(args.userId, 'owner')
						assert.equal(args.token, 'fixture.jwt')
					} else if (command.endsWith('set_instance_player') && failSave)
						throw new Error('Save failed')
				},
			},
		},
	})
	let prompts = 0
	const unregister = registerInstancePlayerPicker(async (_id, locked) => {
		prompts++
		assert.equal(locked, player)
		return player
	})
	const changes: string[] = []
	const stop = onInstancePlayerChanged((id) => changes.push(id))
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
					user: { uuid: 'owner', username: 'Owner' },
				},
			} as unknown as MessageEvent,
			frame,
		)
		await prepareInstancePlayer('one')
		assert.equal(prompts, 0)
		assert.ok(calls.includes('plugin:auth|login_skin_site_player'))
		await saveInstancePlayer('one', player)
		assert.deepEqual(changes, ['one'])
		failSave = true
		await assert.rejects(saveInstancePlayer('two', player), /Save failed/)
		assert.deepEqual(changes, ['one'])
		resetSkinSiteSession()
		await prepareInstancePlayer('one')
		assert.equal(prompts, 1)
	} finally {
		stop()
		unregister()
		resetSkinSiteSession()
		setSkinSiteFrame(null)
		if (previous) Object.defineProperty(globalThis, 'window', previous)
		else Reflect.deleteProperty(globalThis, 'window')
		if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
		else Reflect.deleteProperty(globalThis, 'navigator')
	}
})
