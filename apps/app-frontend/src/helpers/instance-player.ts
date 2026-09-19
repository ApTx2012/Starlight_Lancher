import { invoke } from '@tauri-apps/api/core'

import {
	requestSkinSiteDownloadToken,
	skinSiteStatus,
	skinSiteUser,
	waitForSkinSiteSession,
} from '../composables/skin-site-session.ts'
export { waitForSkinSiteSession } from '../composables/skin-site-session.ts'
import { users } from './auth.js'
import { isOfflineMode } from '../composables/useNetworkStatus.ts'

export type InstancePlayer = {
	id: string
	name: string
	account_type: 'microsoft' | 'yggdrasil' | 'offline'
	skin_site_user?: string | null
}
export type PlayerChoice = InstancePlayer & { head?: string }

/**
 * Thrown when the player picker is dismissed because the user navigated to the
 * skin-site login page. Callers should treat this as a silent launch abort
 * (the user will pick a player next time), not as a real failure.
 */
export class PlayerSelectionNavigatedAwayError extends Error {
	constructor() {
		super('已跳转至皮肤站登录，请登录后重新启动。')
		this.name = 'PlayerSelectionNavigatedAwayError'
	}
}
type Picker = (instanceId: string, locked: InstancePlayer | null) => Promise<InstancePlayer>
let picker: Picker | undefined
const preparing = new Map<string, Promise<void>>()
const listeners = new Set<(instanceId: string, player: InstancePlayer) => void>()

export function onInstancePlayerChanged(
	listener: (instanceId: string, player: InstancePlayer) => void,
) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function registerInstancePlayerPicker(value: Picker) {
	picker = value
	return () => {
		if (picker === value) picker = undefined
	}
}
export const getInstancePlayer = (instanceId: string) =>
	invoke<InstancePlayer | null>('plugin:auth|get_instance_player', { instanceId })

export async function authenticateInstancePlayer(player: InstancePlayer) {
	if (!player.skin_site_user) return
	if (skinSiteStatus.value !== 'signed-in' || skinSiteUser.value?.uuid !== player.skin_site_user) {
		throw new Error(`请登录实例玩家 ${player.name} 所属的皮肤站账号。`)
	}
	const token = await requestSkinSiteDownloadToken()
	await invoke('plugin:auth|login_skin_site_player', {
		token,
		playerId: player.id,
		userId: player.skin_site_user,
	})
	if (skinSiteUser.value?.uuid !== player.skin_site_user || skinSiteStatus.value !== 'signed-in') {
		throw new Error('皮肤站账号已变化，请重试。')
	}
}

/**
 * Registers every skin-site player as a launcher account so they show up in the
 * account picker immediately after signing in to the skin site, instead of only
 * after a first launch. Idempotent: players that already exist in the account
 * list (matched by profile UUID) are skipped, and already-signed-in players are
 * not re-requested. Best-effort: a single player failing does not abort the rest.
 */
export async function registerSkinSitePlayers(
	playerIds: string[],
	userUuid: string,
): Promise<void> {
	if (playerIds.length === 0) return
	if (skinSiteStatus.value !== 'signed-in' || skinSiteUser.value?.uuid !== userUuid) return

	let known = new Set<string>()
	try {
		const existing = await users()
		known = new Set(
			(existing as Array<{ profile?: { id?: string } }>)
				.map((account) => account?.profile?.id)
				.filter((id): id is string => typeof id === 'string'),
		)
	} catch {
		// If the account list cannot be read, still attempt to register; the
		// backend upsert is idempotent.
	}

	for (const playerId of playerIds) {
		if (known.has(playerId)) continue
		if (skinSiteStatus.value !== 'signed-in' || skinSiteUser.value?.uuid !== userUuid) return
		try {
			// Request a fresh download token per player: the skin site login
			// endpoint may bind a token to a single player id.
			const token = await requestSkinSiteDownloadToken()
			await invoke('plugin:auth|login_skin_site_player', {
				token,
				playerId,
				userId: userUuid,
			})
			known.add(playerId)
		} catch (error) {
			console.warn(`Failed to register skin site player ${playerId}:`, error)
		}
	}
}

export async function saveInstancePlayer(instanceId: string, player: InstancePlayer) {
	await authenticateInstancePlayer(player)
	await invoke('plugin:auth|set_instance_player', { instanceId, player })
	for (const listener of listeners) listener(instanceId, player)
}

export async function chooseInstancePlayer(
	instanceId: string,
	locked: InstancePlayer | null = null,
) {
	if (!picker) throw new Error('玩家选择界面尚未就绪，请稍后重试。')
	return picker(instanceId, locked)
}

export function prepareInstancePlayer(instanceId: string): Promise<void> {
	if (isOfflineMode()) return Promise.resolve()
	const current = preparing.get(instanceId)
	if (current) return current
	const task = (async () => {
		const saved = await getInstancePlayer(instanceId)
		if (saved && !saved.skin_site_user) {
			const available = await users()
			if (
				available.some(
					(account) =>
						account.profile.id === saved.id && account.account_type === saved.account_type,
				)
			)
				return
		}
		if (saved?.skin_site_user) await waitForSkinSiteSession()
		if (
			saved?.skin_site_user &&
			skinSiteUser.value?.uuid === saved.skin_site_user &&
			skinSiteStatus.value === 'signed-in'
		) {
			await authenticateInstancePlayer(saved)
			return
		}
		await chooseInstancePlayer(instanceId, saved)
	})().finally(() => {
		preparing.delete(instanceId)
	})
	preparing.set(instanceId, task)
	return task
}
