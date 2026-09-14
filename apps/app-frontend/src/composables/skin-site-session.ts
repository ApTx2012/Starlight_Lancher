import { readonly, ref } from 'vue'

export const SKIN_SITE_ORIGIN = 'https://skin.starlight.cool'
export type SkinSiteUser = { uuid: string; username: string }
export type SkinSiteStatus = 'checking' | 'signed-out' | 'signed-in' | 'error'
export type SkinSitePlayer = {
	uuid: string
	name: string
	isMojang: boolean
	skinState: 'ready' | 'empty' | 'error'
	headDataUrl?: string
	skinDataUrl?: string
	model?: 'default' | 'slim'
}
export type SkinSitePlayersStatus = 'idle' | 'checking' | 'ready' | 'error'

const user = ref<SkinSiteUser | null>(null)
const status = ref<SkinSiteStatus>('signed-out')
const players = ref<SkinSitePlayer[]>([])
const playersStatus = ref<SkinSitePlayersStatus>('idle')
const selectedPlayerId = ref<string | null>(null)
const frameUrl = ref(`${SKIN_SITE_ORIGIN}/`)
let connectedFrame: Window | null = null
let luckRequestSequence = 0
let playersRequestSequence = 0
let skinUpdateRequestSequence = 0

type PendingLuckRequest = {
	resolve: (luck: number) => void
	reject: (error: Error) => void
	timeout: ReturnType<typeof setTimeout>
}

const pendingLuckRequests = new Map<string, PendingLuckRequest>()
type PendingPlayersRequest = {
	resolve: (players: SkinSitePlayer[]) => void
	reject: (error: Error) => void
	timeout: ReturnType<typeof setTimeout>
}
const pendingPlayersRequests = new Map<string, PendingPlayersRequest>()
type PendingSkinUpdateRequest = {
	resolve: () => void
	reject: (error: Error) => void
	timeout: ReturnType<typeof setTimeout>
}
const pendingSkinUpdateRequests = new Map<string, PendingSkinUpdateRequest>()

function isSafePngDataUrl(value: unknown, maxLength: number) {
	return (
		typeof value === 'string' &&
		value.length <= maxLength &&
		/^data:image\/png;base64,[a-z0-9+/]+={0,2}$/i.test(value)
	)
}

function hasSafeSkinHead(player: SkinSitePlayer) {
	if (!['ready', 'empty', 'error'].includes(player.skinState)) return false
	if (player.skinState !== 'ready') return player.headDataUrl === undefined
	return (
		isSafePngDataUrl(player.headDataUrl, 100_000) &&
		(player.skinDataUrl === undefined || isSafePngDataUrl(player.skinDataUrl, 2_000_000)) &&
		(player.model === undefined || player.model === 'default' || player.model === 'slim')
	)
}

export const skinSiteUser = readonly(user)
export const skinSiteStatus = readonly(status)
export const skinSitePlayers = readonly(players)
export const skinSitePlayersStatus = readonly(playersStatus)
export const selectedSkinSitePlayerId = readonly(selectedPlayerId)
export const skinSiteFrameUrl = readonly(frameUrl)

function rejectPendingLuckRequests(message: string) {
	for (const request of pendingLuckRequests.values()) {
		clearTimeout(request.timeout)
		request.reject(new Error(message))
	}
	pendingLuckRequests.clear()
}

function rejectPendingPlayersRequests(message: string) {
	for (const request of pendingPlayersRequests.values()) {
		clearTimeout(request.timeout)
		request.reject(new Error(message))
	}
	pendingPlayersRequests.clear()
}

function rejectPendingSkinUpdateRequests(message: string) {
	for (const request of pendingSkinUpdateRequests.values()) {
		clearTimeout(request.timeout)
		request.reject(new Error(message))
	}
	pendingSkinUpdateRequests.clear()
}

export function setSkinSiteFrame(frame: Window | null) {
	if (connectedFrame === frame) return
	rejectPendingLuckRequests('The skin site connection changed.')
	rejectPendingPlayersRequests('The skin site connection changed.')
	rejectPendingSkinUpdateRequests('The skin site connection changed.')
	connectedFrame = frame
}

export function selectSkinSitePlayer(playerId: string | null) {
	if (playerId === null) {
		selectedPlayerId.value = null
		return
	}
	if (players.value.some((player) => player.uuid === playerId)) selectedPlayerId.value = playerId
}

export function openSkinSiteLogin() {
	frameUrl.value = `${SKIN_SITE_ORIGIN}/login`
}

export function resetSkinSiteSession() {
	rejectPendingLuckRequests('The skin site session ended.')
	rejectPendingPlayersRequests('The skin site session ended.')
	rejectPendingSkinUpdateRequests('The skin site session ended.')
	user.value = null
	status.value = 'signed-out'
	players.value = []
	playersStatus.value = 'idle'
	selectedPlayerId.value = null
}

export function requestSkinSiteSkinUpdate(
	playerId: string,
	textureDataUrl: string,
	model: 'default' | 'slim',
) {
	const player = players.value.find((candidate) => candidate.uuid === playerId)
	if (!connectedFrame || status.value !== 'signed-in' || !user.value) {
		return Promise.reject(new Error('Sign in to the skin site before changing a skin.'))
	}
	if (!player || player.isMojang) {
		return Promise.reject(new Error('This skin site player cannot be changed.'))
	}
	if (!isSafePngDataUrl(textureDataUrl, 2_000_000)) {
		return Promise.reject(new Error('The selected skin texture is invalid or too large.'))
	}

	const requestId = `skin-update-${Date.now()}-${++skinUpdateRequestSequence}`
	return new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			pendingSkinUpdateRequests.delete(requestId)
			reject(new Error('The skin site update timed out.'))
		}, 20_000)
		pendingSkinUpdateRequests.set(requestId, { resolve, reject, timeout })
		try {
			connectedFrame?.postMessage(
				{
					type: 'starlight-skin-update-request',
					requestId,
					playerId,
					textureDataUrl,
					model,
				},
				SKIN_SITE_ORIGIN,
			)
		} catch (error) {
			clearTimeout(timeout)
			pendingSkinUpdateRequests.delete(requestId)
			reject(error instanceof Error ? error : new Error(String(error)))
		}
	})
}

export function requestSkinSitePlayers() {
	if (!connectedFrame || status.value !== 'signed-in' || !user.value) {
		return Promise.reject(new Error('Sign in to the skin site before requesting players.'))
	}

	playersStatus.value = 'checking'
	const requestId = `skin-players-${Date.now()}-${++playersRequestSequence}`
	return new Promise<SkinSitePlayer[]>((resolve, reject) => {
		const timeout = setTimeout(() => {
			pendingPlayersRequests.delete(requestId)
			playersStatus.value = 'error'
			reject(new Error('The skin site player request timed out.'))
		}, 30_000)
		pendingPlayersRequests.set(requestId, { resolve, reject, timeout })
		try {
			connectedFrame?.postMessage(
				{ type: 'starlight-skin-players-request', requestId },
				SKIN_SITE_ORIGIN,
			)
		} catch (error) {
			clearTimeout(timeout)
			pendingPlayersRequests.delete(requestId)
			playersStatus.value = 'error'
			reject(error instanceof Error ? error : new Error(String(error)))
		}
	})
}

export function requestSkinSiteLuck() {
	if (!connectedFrame || status.value !== 'signed-in' || !user.value) {
		return Promise.reject(new Error('Sign in to the skin site before requesting luck.'))
	}

	const requestId = `skin-luck-${Date.now()}-${++luckRequestSequence}`
	return new Promise<number>((resolve, reject) => {
		const timeout = setTimeout(() => {
			pendingLuckRequests.delete(requestId)
			reject(new Error('The skin site luck request timed out.'))
		}, 12_000)
		pendingLuckRequests.set(requestId, { resolve, reject, timeout })
		try {
			connectedFrame?.postMessage(
				{ type: 'starlight-skin-luck-request', requestId },
				SKIN_SITE_ORIGIN,
			)
		} catch (error) {
			clearTimeout(timeout)
			pendingLuckRequests.delete(requestId)
			reject(error instanceof Error ? error : new Error(String(error)))
		}
	})
}

export function receiveSkinSiteMessage(event: MessageEvent, frame: Window | null) {
	if (!frame || event.source !== frame || event.origin !== SKIN_SITE_ORIGIN) return false
	const data = event.data
	if (!data || typeof data !== 'object') return false

	if (data.type === 'starlight-skin-players-result') {
		if (typeof data.requestId !== 'string') return false
		const pending = pendingPlayersRequests.get(data.requestId)
		if (!pending) return false
		clearTimeout(pending.timeout)
		pendingPlayersRequests.delete(data.requestId)
		if (data.ok === true && Array.isArray(data.players)) {
			const nextPlayers = data.players.filter(
				(player: unknown): player is SkinSitePlayer =>
					typeof player === 'object' &&
					player !== null &&
					typeof (player as SkinSitePlayer).uuid === 'string' &&
					/^[0-9a-f-]{32,36}$/i.test((player as SkinSitePlayer).uuid) &&
					typeof (player as SkinSitePlayer).name === 'string' &&
					(player as SkinSitePlayer).name.length > 0 &&
					(player as SkinSitePlayer).name.length <= 64 &&
					typeof (player as SkinSitePlayer).isMojang === 'boolean' &&
					hasSafeSkinHead(player as SkinSitePlayer),
			)
			const previousPlayers = new Map(players.value.map((player) => [player.uuid, player]))
			players.value = nextPlayers.map((player) => {
				const previous = previousPlayers.get(player.uuid)
				return player.skinState === 'error' && previous?.skinState === 'ready'
					? { ...player, ...previous, name: player.name, isMojang: player.isMojang }
					: player
			})
			if (
				selectedPlayerId.value &&
				!nextPlayers.some((player) => player.uuid === selectedPlayerId.value)
			) {
				selectedPlayerId.value = null
			}
			playersStatus.value = 'ready'
			pending.resolve(players.value)
		} else {
			playersStatus.value = 'error'
			pending.reject(
				new Error(
					typeof data.error === 'string' && data.error
						? data.error.slice(0, 300)
						: 'The skin site returned an invalid player list.',
				),
			)
		}
		return true
	}

	if (data.type === 'starlight-skin-luck-result') {
		if (typeof data.requestId !== 'string') return false
		const pending = pendingLuckRequests.get(data.requestId)
		if (!pending) return false
		clearTimeout(pending.timeout)
		pendingLuckRequests.delete(data.requestId)
		if (
			data.ok === true &&
			typeof data.luck === 'number' &&
			Number.isFinite(data.luck) &&
			data.luck >= 0 &&
			data.luck <= 100
		) {
			pending.resolve(data.luck)
		} else {
			pending.reject(
				new Error(
					typeof data.error === 'string' && data.error
						? data.error.slice(0, 300)
						: 'The skin site returned an invalid luck result.',
				),
			)
		}
		return true
	}

	if (data.type === 'starlight-skin-update-result') {
		if (typeof data.requestId !== 'string') return false
		const pending = pendingSkinUpdateRequests.get(data.requestId)
		if (!pending) return false
		clearTimeout(pending.timeout)
		pendingSkinUpdateRequests.delete(data.requestId)
		if (data.ok === true) pending.resolve()
		else {
			pending.reject(
				new Error(
					typeof data.error === 'string' && data.error
						? data.error.slice(0, 300)
						: 'The skin site rejected the skin update.',
				),
			)
		}
		return true
	}

	if (data.type !== 'starlight-skin-session') return false
	if (!['checking', 'signed-out', 'signed-in', 'error'].includes(data.status)) return false
	let refreshPlayers = false
	if (data.status === 'signed-in') {
		if (
			!data.user ||
			typeof data.user.uuid !== 'string' ||
			typeof data.user.username !== 'string' ||
			!data.user.uuid ||
			!data.user.username ||
			data.user.username.length > 256
		)
			return false
		if (user.value?.uuid && user.value.uuid !== data.user.uuid) {
			rejectPendingPlayersRequests('The skin site account changed.')
			rejectPendingSkinUpdateRequests('The skin site account changed.')
			players.value = []
			playersStatus.value = 'idle'
			selectedPlayerId.value = null
		}
		user.value = { uuid: data.user.uuid, username: data.user.username }
		if ([`${SKIN_SITE_ORIGIN}/`, `${SKIN_SITE_ORIGIN}/login`].includes(frameUrl.value)) {
			frameUrl.value = `${SKIN_SITE_ORIGIN}/profile`
		}
		refreshPlayers = true
	} else {
		rejectPendingLuckRequests('The skin site session is unavailable.')
		rejectPendingPlayersRequests('The skin site session is unavailable.')
		rejectPendingSkinUpdateRequests('The skin site session is unavailable.')
		user.value = null
		players.value = []
		playersStatus.value = 'idle'
		selectedPlayerId.value = null
	}
	status.value = data.status
	if (refreshPlayers) void requestSkinSitePlayers().catch(() => {})
	return true
}
