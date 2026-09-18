import { invoke } from '@tauri-apps/api/core'
import {
	requestSkinSiteDownloadToken,
	skinSiteStatus,
	skinSiteUser,
	waitForSkinSiteSession,
} from '../composables/skin-site-session.ts'

let sessionUpdate: Promise<void> = Promise.resolve()
const attemptListeners = new Set<(instanceId: string) => void>()

export function onHostedPackAttemptStarted(listener: (instanceId: string) => void) {
	attemptListeners.add(listener)
	return () => {
		attemptListeners.delete(listener)
	}
}

function startHostedPackAttempt(instanceId: string) {
	for (const listener of attemptListeners) listener(instanceId)
}

export function clearHostedSession(): Promise<void> {
	const update = sessionUpdate
		.catch(() => {})
		.then(() => invokeHosted<void>('plugin:install|hosted_set_session', { token: null }))
	sessionUpdate = update
	return update
}

export async function prepareHostedSession(): Promise<void> {
	await waitForSkinSiteSession()
	const userId = skinSiteUser.value?.uuid
	const token = await requestSkinSiteDownloadToken()
	const update = sessionUpdate
		.catch(() => {})
		.then(async () => {
			if (skinSiteStatus.value !== 'signed-in' || skinSiteUser.value?.uuid !== userId) {
				throw new Error('StarLight 登录状态已变化，请重试。')
			}
			await invokeHosted<void>('plugin:install|hosted_set_session', { token })
		})
	sessionUpdate = update
	await update
}

async function invokeWithSession<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	await prepareHostedSession()
	return invokeHosted<T>(command, args)
}

async function invokeHosted<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	try {
		return await invoke<T>(command, args)
	} catch (cause) {
		if (
			!(cause instanceof Error) &&
			typeof cause === 'object' &&
			cause !== null &&
			'message' in cause &&
			typeof cause.message === 'string'
		) {
			throw new Error(cause.message, { cause })
		}
		throw cause
	}
}

export type InstanceMode = 'starlight' | 'local'
export const getInstanceMode = (instanceId: string) =>
	invokeHosted<InstanceMode>('plugin:install|hosted_instance_mode', { instanceId })
export const setInstanceMode = (instanceId: string, mode: InstanceMode) => {
	if (mode === 'starlight') startHostedPackAttempt(instanceId)
	return (mode === 'starlight' ? invokeWithSession<void> : invokeHosted<void>)(
		'plugin:install|hosted_set_instance_mode',
		{ instanceId, mode },
	)
}

export interface HostedPublication {
	packId: string
	releaseId: number
	manifest: {
		name: string
		version: string
		format: string
		runtime: { gameVersion: string; loader: string; loaderVersion: string | null }
		files: { path: string; size: number; sha256: string }[]
	}
}
export interface HostedBinding {
	publication: HostedPublication
}
export interface HostedSyncResult {
	version: string
	downloadedBytes: number
	changedFiles: number
	preservedFiles: string[]
}
export const hostedDefault = () =>
	invokeWithSession<HostedPublication>('plugin:install|hosted_default')
export const hostedCreate = (gameDirRoot?: string | null) =>
	invokeWithSession<string>('plugin:install|hosted_create', {
		gameDirRoot: gameDirRoot ?? null,
	})
export const hostedBinding = (instanceId: string) =>
	invokeHosted<HostedBinding | null>('plugin:install|hosted_binding', { instanceId })
export const hostedSync = (instanceId: string) => {
	startHostedPackAttempt(instanceId)
	return invokeWithSession<HostedSyncResult>('plugin:install|hosted_sync', { instanceId })
}
