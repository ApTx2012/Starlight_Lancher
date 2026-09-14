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
	const pendingSkinUpdates = new Map()
	let knownPlayers = new Map()
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

	function publishSkinUpdate(requestId, result) {
		if (!parentOrigin) return
		window.parent.postMessage(
			{ type: 'starlight-skin-update-result', requestId, ...result },
			parentOrigin,
		)
	}

	// Keep this geometry identical to the skin site's SkinRender.renderHead.
	// In particular, the site does not infer texture dimensions before cropping.
	// Rendering here keeps the source on the skin site's origin and only exposes
	// the finished PNG to the launcher.
	function renderPlayerHead(skinSource) {
		return new Promise((resolve, reject) => {
			const image = new Image()
			const timeout = setTimeout(() => reject(new Error('Skin rendering timed out.')), 8_000)
			image.crossOrigin = 'anonymous'
			image.onerror = () => {
				clearTimeout(timeout)
				reject(new Error('Unable to load the skin texture.'))
			}
			image.onload = () => {
				clearTimeout(timeout)
				try {
					const buffer = document.createElement('canvas')
					buffer.width = 18
					buffer.height = 18
					const context = buffer.getContext('2d')
					if (!context) throw new Error('Unable to create the skin renderer.')
					context.imageSmoothingEnabled = false
					context.drawImage(image, 8, 8, 8, 8, 1, 1, 16, 16)
					context.globalCompositeOperation = 'source-over'
					context.drawImage(image, 40, 8, 8, 8, 0, 0, 18, 18)

					const output = document.createElement('canvas')
					output.width = 36
					output.height = 36
					const outputContext = output.getContext('2d')
					if (!outputContext) throw new Error('Unable to create the skin renderer.')
					outputContext.imageSmoothingEnabled = false
					outputContext.drawImage(buffer, 0, 0, 18, 18, 0, 0, 36, 36)
					resolve(output.toDataURL('image/png'))
				} catch (error) {
					reject(error)
				}
			}
			image.src = skinSource
		})
	}

	function serializePlayerSkin(skinSource) {
		return new Promise((resolve, reject) => {
			const image = new Image()
			const timeout = setTimeout(() => reject(new Error('Skin loading timed out.')), 8_000)
			image.crossOrigin = 'anonymous'
			image.onerror = () => {
				clearTimeout(timeout)
				reject(new Error('Unable to load the skin texture.'))
			}
			image.onload = () => {
				clearTimeout(timeout)
				try {
					const width = image.naturalWidth || image.width
					const height = image.naturalHeight || image.height
					if (!width || !height) throw new Error('The skin texture is empty.')
					const canvas = document.createElement('canvas')
					canvas.width = width
					canvas.height = height
					const context = canvas.getContext('2d')
					if (!context) throw new Error('Unable to create the skin renderer.')
					context.imageSmoothingEnabled = false
					context.drawImage(image, 0, 0)
					const dataUrl = canvas.toDataURL('image/png')
					if (dataUrl.length > 2_000_000) throw new Error('The skin texture is too large.')
					resolve(dataUrl)
				} catch (error) {
					reject(error)
				}
			}
			image.src = skinSource
		})
	}

	function sleep(delay) {
		return new Promise((resolve) => setTimeout(resolve, delay))
	}

	function pngDataUrlToBlob(dataUrl) {
		if (
			typeof dataUrl !== 'string' ||
			dataUrl.length > 2_000_000 ||
			!/^data:image\/png;base64,[a-z0-9+/]+={0,2}$/i.test(dataUrl)
		)
			throw new Error('Invalid skin texture.')
		const bytes = atob(dataUrl.slice(dataUrl.indexOf(',') + 1))
		const buffer = new Uint8Array(bytes.length)
		for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index)
		return new Blob([buffer], { type: 'image/png' })
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
				knownPlayers = new Map(players.map((player) => [player.uuid, player]))
				// Match the skin site: stagger texture requests by 150 ms so the
				// service is not hit with a burst that can drop individual players.
				const skinResults = await Promise.all(
					players.map(async (player, index) => {
						if (index > 0) await sleep(index * 150)
						try {
							const skinResponse = await fetch(
								`/starlight/skin/player/skin/${encodeURIComponent(player.uuid)}`,
								{
									headers: { Authorization: `Bearer ${token}` },
									signal: controller.signal,
									cache: 'no-store',
									redirect: 'error',
								},
							)
							const skinBody = await skinResponse.json().catch(() => null)
							if (
								!skinResponse.ok ||
								!skinBody?.payload ||
								typeof skinBody.payload !== 'object'
							)
								return { player, skinData: null }
							return { player, skinData: skinBody.payload }
						} catch {
							return { player, skinData: null }
						}
					}),
				)
				const playersWithSkins = await Promise.all(
					skinResults.map(async ({ player, skinData }) => {
						if (!skinData) return { ...player, skinState: 'error' }
						try {
							const skinSource = skinData.skin
							if (typeof skinSource !== 'string' || !skinSource.trim()) {
								return { ...player, skinState: 'empty' }
							}
							const headDataUrl = await renderPlayerHead(skinSource.trim())
							const skinDataUrl = await serializePlayerSkin(skinSource.trim()).catch(
								() => undefined,
							)
							const model = skinData.model === 'slim' ? 'slim' : 'default'
							return { ...player, skinState: 'ready', headDataUrl, skinDataUrl, model }
						} catch {
							return { ...player, skinState: 'error' }
						}
					}),
				)
				if (localStorage.getItem('loginToken') !== token) {
					publishPlayers(requestId, { ok: false, error: 'The skin site account changed.' })
					return
				}
				publishPlayers(requestId, { ok: true, players: playersWithSkins })
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
			pendingPlayers.delete(requestId)
		}
	}

	async function updatePlayerSkin(requestId, playerId, textureDataUrl, model) {
		if (pendingSkinUpdates.has(requestId)) return
		const player = knownPlayers.get(playerId)
		if (!player || player.isMojang) {
			publishSkinUpdate(requestId, {
				ok: false,
				error: 'This skin site player cannot be changed.',
			})
			return
		}
		let token
		try {
			token = localStorage.getItem('loginToken') || ''
		} catch {
			publishSkinUpdate(requestId, { ok: false, error: 'Unable to read the skin site session.' })
			return
		}
		if (!token) {
			publish('signed-out')
			publishSkinUpdate(requestId, { ok: false, error: 'Sign in to the skin site first.' })
			return
		}

		const controller = new AbortController()
		pendingSkinUpdates.set(requestId, controller)
		const timeout = setTimeout(() => controller.abort(), 18_000)
		try {
			const texture = pngDataUrlToBlob(textureDataUrl)
			const form = new FormData()
			form.append('file', texture, `${playerId}.png`)
			form.append('model', model)
			const response = await fetch(
				`/starlight/skin/player/skin/${encodeURIComponent(playerId)}/SKIN`,
				{
					method: 'PUT',
					headers: { Authorization: `Bearer ${token}` },
					body: form,
					signal: controller.signal,
					cache: 'no-store',
					redirect: 'error',
				},
			)
			const body = await response.json().catch(() => null)
			if (localStorage.getItem('loginToken') !== token) {
				publishSkinUpdate(requestId, { ok: false, error: 'The skin site account changed.' })
				return
			}
			if (response.status === 401 || response.status === 403) publish('signed-out')
			if (response.ok && body?.success !== false) publishSkinUpdate(requestId, { ok: true })
			else {
				publishSkinUpdate(requestId, {
					ok: false,
					error:
						typeof body?.errorMessage === 'string' && body.errorMessage
							? body.errorMessage.slice(0, 300)
							: 'The skin site rejected the skin update.',
				})
			}
		} catch (error) {
			publishSkinUpdate(requestId, {
				ok: false,
				error: error instanceof Error ? error.message : 'Unable to reach the skin service.',
			})
		} finally {
			clearTimeout(timeout)
			pendingSkinUpdates.delete(requestId)
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
		if (changed) knownPlayers = new Map()
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
			return
		}
		if (
			event.data?.type === 'starlight-skin-update-request' &&
			parentOrigin === event.origin &&
			typeof event.data.requestId === 'string' &&
			/^skin-update-\d+-\d+$/.test(event.data.requestId) &&
			typeof event.data.playerId === 'string' &&
			/^[0-9a-f-]{32,36}$/i.test(event.data.playerId) &&
			(event.data.model === 'default' || event.data.model === 'slim')
		) {
			void updatePlayerSkin(
				event.data.requestId,
				event.data.playerId,
				event.data.textureDataUrl,
				event.data.model,
			)
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
		for (const controller of pendingSkinUpdates.values()) controller.abort()
		pendingSkinUpdates.clear()
	})
	window.addEventListener('pageshow', (event) => {
		if (!event.persisted) return
		timer = setInterval(() => void checkSession(), 1000)
		void checkSession(true)
	})
})()
