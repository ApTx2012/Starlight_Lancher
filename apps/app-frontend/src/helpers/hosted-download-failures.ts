import type { LoadingBar } from './state.ts'

export function createHostedDownloadFailures() {
	const failures = new Map<string, LoadingBar>()
	const retired = new Set<string>()
	const currentTasks = new Map<string, string>()
	return {
		values: () => [...failures.values()],
		has: (instanceId: string) => failures.has(instanceId),
		isRetired: (id: string) => retired.has(id),
		begin(instanceId: string, bars: LoadingBar[]) {
			const current = currentTasks.get(instanceId)
			if (current) retired.add(current)
			currentTasks.delete(instanceId)
			const previous = failures.get(instanceId)
			if (previous) retired.add(String(previous.loading_bar_uuid))
			for (const bar of bars) {
				if (bar.bar_type?.type === 'hosted_pack_sync' && bar.bar_type.instance_id === instanceId) {
					retired.add(String(bar.loading_bar_uuid))
				}
			}
			failures.delete(instanceId)
		},
		update(payload: {
			fraction: number | null
			loader_uuid: string
			event: LoadingBar['bar_type']
		}) {
			const event = payload.event
			if (
				event?.type !== 'hosted_pack_sync' ||
				!event.instance_id ||
				retired.has(payload.loader_uuid)
			)
				return
			const current = currentTasks.get(event.instance_id)
			if (current && current !== payload.loader_uuid) retired.add(current)
			currentTasks.set(event.instance_id, payload.loader_uuid)
			if (payload.fraction === null && event.error) {
				failures.set(event.instance_id, {
					loading_bar_uuid: payload.loader_uuid,
					bar_type: event,
					title: event.instance_name,
					message: event.error,
					total: 0,
					current: 0,
				})
			} else {
				failures.delete(event.instance_id)
			}
		},
	}
}
