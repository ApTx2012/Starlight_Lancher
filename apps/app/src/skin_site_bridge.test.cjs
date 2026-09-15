const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const test = require('node:test')
const source = fs.readFileSync(require('node:path').join(__dirname, 'skin_site_bridge.js'), 'utf8')

function harness(origin = 'https://skin.starlight.cool', skinSize = 64) {
	let token = null
	const listeners = {},
		messages = [],
		requests = [],
		drawCalls = []
	const skinWidth = typeof skinSize === 'number' ? skinSize : skinSize.width
	const skinHeight = typeof skinSize === 'number' ? skinSize : skinSize.height
	let tick
	let result = async () => ({
		ok: true,
		status: 200,
		json: async () => ({ payload: { uuid: 'one', username: 'One' } }),
	})
	const parent = {
		postMessage(data, target) {
			messages.push({ data, target })
		},
	}
	const context = {
		location: { origin },
		window: {
			parent,
			addEventListener(type, callback) {
				listeners[type] = callback
			},
		},
		localStorage: {
			getItem() {
				return token
			},
		},
		fetch(...args) {
			requests.push(args)
			return result(...args)
		},
		AbortController,
		Blob,
		Date,
		FormData,
		Uint8Array,
		atob,
			document: {
				createElement() {
					return {
						getContext() {
							return {
								drawImage(...args) {
									drawCalls.push(args)
								},
							}
					},
					toDataURL() {
						return 'data:image/png;base64,SEVBRERBVEE='
					},
				}
			},
			},
			Image: class {
				naturalWidth = skinWidth
				naturalHeight = skinHeight
			set src(_value) {
				queueMicrotask(() => this.onload?.())
			}
		},
		setTimeout,
		clearTimeout,
		setInterval(callback) {
			tick = callback
			return 1
		},
		clearInterval() {},
	}
	vm.runInNewContext(source, context)
	return {
		drawCalls,
		messages,
		requests,
		listeners,
		parent,
		token(value) {
			token = value
		},
		result(value) {
			result = value
		},
		async tick() {
			tick?.()
			await new Promise(setImmediate)
		},
		async connect(origin = 'http://localhost:5201', source = parent) {
			listeners.message?.({ source, origin, data: { type: 'starlight-skin-session-connect' } })
			await new Promise(setImmediate)
		},
		async message(data, origin = 'http://localhost:5201', source = parent) {
			listeners.message?.({ source, origin, data })
			await new Promise(setImmediate)
		},
		async waitForMessage(type, requestId, timeout = 2_000) {
			const deadline = Date.now() + timeout
			while (Date.now() < deadline) {
				const message = messages.find(
					(entry) =>
						entry.data?.type === type &&
						(requestId === undefined || entry.data?.requestId === requestId),
				)
				if (message) return message
				await new Promise((resolve) => setTimeout(resolve, 10))
			}
			throw new Error(`Timed out waiting for ${type}`)
		},
	}
}

test('bridge is restricted to the skin origin and an allowlisted parent', async () => {
	assert.equal(harness('https://evil.example').listeners.message, undefined)
	const h = harness()
	h.token('test-token')
	await h.connect('https://evil.example')
	await h.connect('http://localhost:5201', {})
	assert.equal(h.requests.length, 0)
	assert.equal(h.messages.length, 0)
	await h.connect()
	assert.equal(h.requests[0][0], '/starlight/user')
	assert.equal(h.requests[0][1].headers.Authorization, 'Bearer test-token')
	assert.equal(h.requests[0][1].redirect, 'error')
	assert.equal(h.messages.at(-1).data.status, 'signed-in')
	assert.ok(h.messages.every((m) => m.target === 'http://localhost:5201'))
	assert.ok(!JSON.stringify(h.messages).includes('test-token'))
})

test('logout, invalid token, network error and account switching replace old state', async () => {
	const h = harness()
	await h.connect()
	assert.equal(h.messages.at(-1).data.status, 'signed-out')
	h.token('first')
	await h.tick()
	assert.equal(h.messages.at(-1).data.user.username, 'One')
	h.result(async () => ({ ok: false, status: 401 }))
	h.token('expired')
	await h.tick()
	assert.equal(h.messages.at(-1).data.status, 'signed-out')
	h.result(async () => {
		throw Error('offline')
	})
	h.token('network-error')
	await h.tick()
	assert.equal(h.messages.at(-1).data.status, 'error')
	h.token(null)
	await h.tick()
	assert.equal(h.messages.at(-1).data.status, 'signed-out')
})

test('pack JWT is returned only for an explicit request from the connected launcher', async () => {
	const h = harness()
	h.token('pack.jwt.secret')
	const request = { type: 'starlight-pack-token-request', requestId: 'pack-token-1-1' }
	await h.message(request)
	await h.connect('https://evil.example')
	assert.equal(h.messages.length, 0)
	await h.connect()
	assert.ok(!JSON.stringify(h.messages).includes('pack.jwt.secret'))
	await h.message(request, 'https://evil.example')
	await h.message(request, 'http://localhost:5201', {})
	assert.ok(!JSON.stringify(h.messages).includes('pack.jwt.secret'))
	await h.message(request)
	assert.equal(h.messages.at(-1).data.type, 'starlight-pack-token-result')
	assert.equal(h.messages.at(-1).data.token, 'pack.jwt.secret')
	assert.equal(h.messages.at(-1).target, 'http://localhost:5201')
	h.token('unverified.account.token')
	await h.message({ ...request, requestId: 'pack-token-1-2' })
	assert.equal(h.messages.at(-1).data.token, null)
	h.token(null)
	await h.message({ ...request, requestId: 'pack-token-1-3' })
	assert.equal(h.messages.at(-1).data.token, null)
})

test('a delayed response cannot restore the user after logout', async () => {
	const h = harness()
	let finish
	h.result(
		() =>
			new Promise((resolve) => {
				finish = resolve
			}),
	)
	h.token('first')
	await h.connect()
	h.token(null)
	await h.tick()
	finish({
		ok: true,
		status: 200,
		json: async () => ({ payload: { uuid: 'one', username: 'One' } }),
	})
	await new Promise(setImmediate)
	assert.equal(h.messages.at(-1).data.status, 'signed-out')
	assert.ok(!h.messages.some((m) => m.data.status === 'signed-in'))
})

test('luck requests stay on the skin origin and return only the validated score', async () => {
	const h = harness()
	h.token('test-token')
	await h.connect()
	h.result(async () => ({
		ok: true,
		status: 200,
		json: async () => ({ payload: { luck: 73 } }),
	}))
	await h.message({ type: 'starlight-skin-luck-request', requestId: 'skin-luck-1-1' })
	const request = h.requests.at(-1)
	assert.equal(request[0], '/starlight/luck')
	assert.equal(request[1].headers.Authorization, 'Bearer test-token')
	assert.equal(request[1].redirect, 'error')
	const message = h.messages.at(-1)
	assert.equal(message.target, 'http://localhost:5201')
	assert.equal(message.data.type, 'starlight-skin-luck-result')
	assert.equal(message.data.requestId, 'skin-luck-1-1')
	assert.equal(message.data.ok, true)
	assert.equal(message.data.luck, 73)
	assert.ok(!JSON.stringify(h.messages).includes('test-token'))
})

test('luck requests reject untrusted parents, missing sessions, and invalid scores', async () => {
	const h = harness()
	await h.connect()
	const before = h.requests.length
	await h.message(
		{ type: 'starlight-skin-luck-request', requestId: 'skin-luck-2-1' },
		'https://evil.example',
	)
	assert.equal(h.requests.length, before)
	await h.message({ type: 'starlight-skin-luck-request', requestId: 'skin-luck-2-2' })
	assert.equal(h.requests.length, before)
	assert.equal(h.messages.at(-1).data.ok, false)

	h.token('test-token')
	h.result(async () => ({
		ok: true,
		status: 200,
		json: async () => ({ payload: { luck: 101 } }),
	}))
	await h.message({ type: 'starlight-skin-luck-request', requestId: 'skin-luck-2-3' })
	assert.equal(h.messages.at(-1).data.ok, false)
})

test('player requests return a sanitized complete player collection without exposing the token', async () => {
	const h = harness()
	h.token('test-token')
	await h.connect()
	h.result(async (url) => {
		if (url.startsWith('/starlight/skin/player/skin/')) {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					payload: {
						skin: url.endsWith('0123456789abcdef0123456789abcdef')
							? '/textures/player-one.png'
							: null,
					},
				}),
			}
		}
		return {
			ok: true,
			status: 200,
			json: async () => ({
				payload: [
					{ uuid: '0123456789abcdef0123456789abcdef', name: 'PlayerOne', isMojang: false },
					{ uuid: 'fedcba9876543210fedcba9876543210', name: 'Official', isMojang: true },
					{ uuid: 'bad', name: 'Ignored', isMojang: false },
				],
			}),
		}
	})
	await h.message({ type: 'starlight-skin-players-request', requestId: 'skin-players-1-1' })
	await h.waitForMessage('starlight-skin-players-result', 'skin-players-1-1')
	const request = h.requests.find(([url]) => url === '/starlight/skin/player')
	assert.equal(request[0], '/starlight/skin/player')
	assert.equal(request[1].headers.Authorization, 'Bearer test-token')
	assert.equal(
		h.requests.filter(([url]) => url.startsWith('/starlight/skin/player/skin/')).length,
		2,
	)
	const message = h.messages.at(-1)
	assert.equal(message.data.type, 'starlight-skin-players-result')
	assert.equal(message.data.ok, true)
	assert.equal(message.data.players.length, 2)
	assert.equal(message.data.players[1].isMojang, true)
	assert.equal(message.data.players[0].skinState, 'ready')
	assert.equal(message.data.players[0].headDataUrl, 'data:image/png;base64,SEVBRERBVEE=')
	assert.equal(message.data.players[0].skinDataUrl, 'data:image/png;base64,SEVBRERBVEE=')
	assert.equal(message.data.players[0].model, 'default')
	assert.equal(message.data.players[1].skinState, 'empty')
	assert.equal(message.data.players[1].headDataUrl, undefined)
	assert.ok(!JSON.stringify(h.messages).includes('test-token'))
})

test('skin updates upload a PNG to the selected skin-site player without exposing the token', async () => {
	const h = harness()
	h.token('test-token')
	await h.connect()
	h.result(async (url) => ({
		ok: true,
		status: 200,
		json: async () => ({
			payload:
				url === '/starlight/skin/player'
					? [
							{
								uuid: '0123456789abcdef0123456789abcdef',
								name: 'PlayerOne',
								isMojang: false,
							},
						]
					: { skin: null },
		}),
	}))
	await h.message({ type: 'starlight-skin-players-request', requestId: 'skin-players-2-1' })
	h.result(async () => ({
		ok: true,
		status: 200,
		json: async () => ({ success: true, payload: 'updated' }),
	}))
	await h.message({
		type: 'starlight-skin-update-request',
		requestId: 'skin-update-1-1',
		playerId: '0123456789abcdef0123456789abcdef',
		textureDataUrl: 'data:image/png;base64,SEVBRERBVEE=',
		model: 'slim',
	})

	const request = h.requests.at(-1)
	assert.equal(
		request[0],
		'/starlight/skin/player/skin/0123456789abcdef0123456789abcdef/SKIN',
	)
	assert.equal(request[1].method, 'PUT')
	assert.equal(request[1].headers.Authorization, 'Bearer test-token')
	assert.equal(request[1].body.get('model'), 'slim')
	assert.equal(request[1].body.get('file').type, 'image/png')
	assert.equal(h.messages.at(-1).data.type, 'starlight-skin-update-result')
	assert.equal(h.messages.at(-1).data.ok, true)
	assert.ok(!JSON.stringify(h.messages).includes('test-token'))
})

test('skin rendering uses the skin site crop and preserves the source texture dimensions', async () => {
	const h = harness('https://skin.starlight.cool', { width: 64, height: 128 })
	h.token('test-token')
	await h.connect()
	h.result(async (url) => ({
		ok: true,
		status: 200,
		json: async () => ({
			payload:
				url === '/starlight/skin/player'
					? [
							{
								uuid: '0123456789abcdef0123456789abcdef',
								name: 'HighResolutionPlayer',
								isMojang: false,
							},
						]
					: { skin: '/textures/hd.png', model: 'slim' },
		}),
	}))
	await h.message({ type: 'starlight-skin-players-request', requestId: 'skin-players-3-1' })

	const player = h.messages.at(-1).data.players[0]
	assert.equal(player.skinState, 'ready')
	assert.equal(player.headDataUrl, 'data:image/png;base64,SEVBRERBVEE=')
	assert.equal(player.skinDataUrl, 'data:image/png;base64,SEVBRERBVEE=')
	assert.equal(player.model, 'slim')
	assert.deepEqual(h.drawCalls[0].slice(1), [8, 8, 8, 8, 1, 1, 16, 16])
	assert.deepEqual(h.drawCalls[1].slice(1), [40, 8, 8, 8, 0, 0, 18, 18])
})
