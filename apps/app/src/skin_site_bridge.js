// Runs inside the embedded skin site only. The JWT never leaves that origin.
;(() => {
	if (location.origin !== 'https://skin.starlight.cool' || window.parent === window) return

	const launcherOrigins = new Set([
		'http://localhost:5201',
		'http://tauri.localhost',
		'https://tauri.localhost',
		'tauri://localhost',
	])
	let parentOrigin
	let lastToken
	let lastCheck = 0
	let generation = 0
	let pending
	const pendingLuck = new Map()
	const pendingPlayers = new Map()
	let snapshot = { status: 'checking', user: null }

	function publish(status, user = null) {
		snapshot = { status, user }
		if (parentOrigin) {
			window.parent.postMessage({ type: 'starlight-skin-session', ...snapshot }, parentOrigin)
		}
	}

	function publishLuck(requestId, result) {
		if (!parentOrigin) return
		window.parent.postMessage(
			{ type: 'starlight-skin-luck-result', requestId, ...result },
			parentOrigin,
		)
	}

	function publishPlayers(requestId, result) {
		if (!parentOrigin) return
		window.parent.postMessage(
			{ type: 'starlight-skin-players-result', requestId, ...result },
			parentOrigin,
		)
	}

	async function requestPlayers(requestId) {
		if (pendingPlayers.has(requestId)) return
		let token
		try {
			token = localStorage.getItem('loginToken') || ''
		} catch {
			publishPlayers(requestId, { ok: false, error: 'Unable to read the skin site session.' })
			return
		}
		if (!token) {
			publish('signed-out')
			publishPlayers(requestId, { ok: false, error: 'Sign in to the skin site first.' })
			return
		}

		const controller = new AbortController()
		pendingPlayers.set(requestId, controller)
		const timeout = setTimeout(() => controller.abort(), 10_000)
		try {
			const response = await fetch('/starlight/skin/player', {
				headers: { Authorization: `Bearer ${token}` },
				signal: controller.signal,
				cache: 'no-store',
				redirect: 'error',
			})
			const body = await response.json().catch(() => null)
			if (localStorage.getItem('loginToken') !== token) {
				publishPlayers(requestId, { ok: false, error: 'The skin site account changed.' })
				return
			}
			if (response.status === 401 || response.status === 403) publish('signed-out')
			const rawPlayers = Array.isArray(body?.payload) ? body.payload : null
			const players = rawPlayers?.slice(0, 100).flatMap((player) => {
				if (
					typeof player?.uuid !== 'string' ||
					!/^[0-9a-f-]{32,36}$/i.test(player.uuid) ||
					typeof player?.name !== 'string' ||
					player.name.length < 1 ||
					player.name.length > 64
				)
					return []
				return [{ uuid: player.uuid, name: player.name, isMojang: player.isMojang === true }]
			})
			if (response.ok && players) {
				publishPlayers(requestId, { ok: true, players })
			} else {
				publishPlayers(requestId, {
					ok: false,
					error:
						typeof body?.errorMessage === 'string' && body.errorMessage
							? body.errorMessage.slice(0, 300)
							: 'The skin site returned an invalid player list.',
				})
			}
		} catch {
			publishPlayers(requestId, { ok: false, error: 'Unable to reach the player service.' })
		} finally {
			clearTimeout(timeout)
			pendingPlayers.delete(requestId)
		}
	}

	async function requestLuck(requestId) {
		if (pendingLuck.has(requestId)) return
		let token
		try {
			token = localStorage.getItem('loginToken') || ''
		} catch {
			publishLuck(requestId, { ok: false, error: 'Unable to read the skin site session.' })
			return
		}
		if (!token) {
			publish('signed-out')
			publishLuck(requestId, { ok: false, error: 'Sign in to the skin site first.' })
			return
		}

		const controller = new AbortController()
		pendingLuck.set(requestId, controller)
		const timeout = setTimeout(() => controller.abort(), 10_000)
		try {
			const response = await fetch('/starlight/luck', {
				headers: { Authorization: `Bearer ${token}` },
				signal: controller.signal,
				cache: 'no-store',
				redirect: 'error',
			})
			const body = await response.json().catch(() => null)
			if (localStorage.getItem('loginToken') !== token) {
				publishLuck(requestId, { ok: false, error: 'The skin site account changed.' })
				return
			}
			if (response.status === 401 || response.status === 403) publish('signed-out')
			const luck = Number(body?.payload?.luck)
			if (response.ok && Number.isFinite(luck) && luck >= 0 && luck <= 100) {
				publishLuck(requestId, { ok: true, luck })
			} else {
				publishLuck(requestId, {
					ok: false,
					error:
						typeof body?.errorMessage === 'string' && body.errorMessage
							? body.errorMessage.slice(0, 300)
							: 'The skin site returned an invalid luck result.',
				})
			}
		} catch {
			publishLuck(requestId, { ok: false, error: 'Unable to reach the luck service.' })
		} finally {
			clearTimeout(timeout)
			pendingLuck.delete(requestId)
		}
	}

	async function checkSession(force = false) {
		if (!parentOrigin) return
		let token
		try {
			token = localStorage.getItem('loginToken') || ''
		} catch {
			publish('error')
			return
		}
		const changed = token !== lastToken
		if (!changed && (pending || (!force && Date.now() - lastCheck < 60_000))) return
		const revision = ++generation
		pending?.abort()
		pending = undefined
		lastToken = token
		lastCheck = Date.now()
		if (!token) {
			publish('signed-out')
			return
		}
		if (changed) publish('checking')
		const controller = new AbortController()
		pending = controller
		const timeout = setTimeout(() => controller.abort(), 10_000)
		try {
			const response = await fetch('/starlight/user', {
				headers: { Authorization: `Bearer ${token}` },
				signal: controller.signal,
				cache: 'no-store',
				redirect: 'error',
			})
			const body = response.ok ? await response.json() : null
			// A logout or account switch must win over an older in-flight response.
			if (revision !== generation || localStorage.getItem('loginToken') !== token) return
			if (response.status === 401 || response.status === 403 || body?.payload?.banned) {
				publish('signed-out')
			} else if (
				response.ok &&
				typeof body?.payload?.uuid === 'string' &&
				typeof body.payload.username === 'string' &&
				body.payload.username.length > 0
			) {
				publish('signed-in', { uuid: body.payload.uuid, username: body.payload.username })
			} else {
				publish('error')
			}
		} catch {
			if (revision === generation) publish('error')
		} finally {
			clearTimeout(timeout)
			if (revision === generation) pending = undefined
		}
	}

	window.addEventListener('message', (event) => {
		if (event.source !== window.parent || !launcherOrigins.has(event.origin)) return
		if (event.data?.type === 'starlight-skin-session-connect') {
			parentOrigin = event.origin
			publish(snapshot.status, snapshot.user)
			void checkSession(true)
			return
		}
		if (
			event.data?.type === 'starlight-skin-luck-request' &&
			parentOrigin === event.origin &&
			typeof event.data.requestId === 'string' &&
			/^skin-luck-\d+-\d+$/.test(event.data.requestId)
		) {
			void requestLuck(event.data.requestId)
			return
		}
		if (
			event.data?.type === 'starlight-skin-players-request' &&
			parentOrigin === event.origin &&
			typeof event.data.requestId === 'string' &&
			/^skin-players-\d+-\d+$/.test(event.data.requestId)
		) {
			void requestPlayers(event.data.requestId)
		}
	})
	// Storage events cover other tabs; polling also covers same-document SPA login/logout.
	window.addEventListener('storage', () => void checkSession())
	let timer = setInterval(() => void checkSession(), 1000)
	window.addEventListener('pagehide', () => {
		clearInterval(timer)
		++generation
		pending?.abort()
		pending = undefined
		for (const controller of pendingLuck.values()) controller.abort()
		pendingLuck.clear()
		for (const controller of pendingPlayers.values()) controller.abort()
		pendingPlayers.clear()
	})
	window.addEventListener('pageshow', (event) => {
		if (!event.persisted) return
		timer = setInterval(() => void checkSession(), 1000)
		void checkSession(true)
	})
})()
