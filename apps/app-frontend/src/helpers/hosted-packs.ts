import { invoke } from '@tauri-apps/api/core'

export type InstanceMode = 'starlight' | 'local'
export const getInstanceMode = (instanceId: string) =>
	invoke<InstanceMode>('plugin:install|hosted_instance_mode', { instanceId })
export const setInstanceMode = (instanceId: string, mode: InstanceMode) =>
	invoke<void>('plugin:install|hosted_set_instance_mode', { instanceId, mode })

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
export const hostedCatalog = () => invoke<HostedPublication[]>('plugin:install|hosted_catalog')
export const hostedBinding = (instanceId: string) =>
	invoke<HostedBinding | null>('plugin:install|hosted_binding', { instanceId })
export const hostedSync = (instanceId: string, packId: string) =>
	invoke<HostedSyncResult>('plugin:install|hosted_sync', { instanceId, packId })
