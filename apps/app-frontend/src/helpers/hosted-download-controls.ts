import type { LoadingBar } from './state.ts'

export type HostedDownloadControl = 'pause' | 'resume' | 'cancel'
export type HostedDownloadAction = HostedDownloadControl | 'retry'

export function runHostedDownloadAction(
	action: HostedDownloadAction,
	instanceId: string,
	operations: {
		retryHosted: (instanceId: string) => Promise<void>
		control: (action: HostedDownloadControl, instanceId: string) => Promise<void>
	},
) {
	return action === 'retry'
		? operations.retryHosted(instanceId)
		: operations.control(action, instanceId)
}

export function hostedDownloadState(bar: LoadingBar) {
	return bar.bar_type?.state ?? (bar.bar_type?.error ? 'failed' : 'running')
}

export function hostedDownloadActions(bar: LoadingBar): HostedDownloadAction[] {
	const type = bar.bar_type
	if (type?.type !== 'hosted_pack_sync' || !type.instance_id) return []
	const state = hostedDownloadState(bar)
	if (state === 'failed' || state === 'canceled') return ['retry']
	if (state !== 'running' && state !== 'paused') return []
	const actions: HostedDownloadAction[] = []
	if (type.can_pause) actions.push(state === 'paused' ? 'resume' : 'pause')
	if (type.can_cancel) actions.push('cancel')
	return actions
}

export async function runHostedDownloadControl(
	action: HostedDownloadControl,
	instanceId: string,
	dependencies: {
		prepareSession: () => Promise<void>
		invoke: (command: string, args: { instanceId: string }) => Promise<void>
	},
) {
	if (action === 'resume') await dependencies.prepareSession()
	await dependencies.invoke(`plugin:install|hosted_${action}`, { instanceId })
}
