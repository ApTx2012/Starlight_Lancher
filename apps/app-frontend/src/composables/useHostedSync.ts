import { computed, reactive } from 'vue'

import { hostedSync, type HostedSyncResult } from '../helpers/hosted-packs.ts'

const tasks = reactive(
	new Map<string, { busy: boolean; result: HostedSyncResult | null; error: string }>(),
)
const inFlight = new Map<string, Promise<HostedSyncResult>>()

function getTask(instanceId: string) {
	if (!tasks.has(instanceId)) tasks.set(instanceId, { busy: false, result: null, error: '' })
	return tasks.get(instanceId)!
}

/**
 * Run one authoritative StarLight synchronization per instance. Every retry
 * surface uses this function so the full pack transaction, its progress and
 * its final result cannot diverge between pages.
 */
export function runHostedSync(instanceId: string): Promise<HostedSyncResult> {
	const existing = inFlight.get(instanceId)
	if (existing) return existing

	const current = getTask(instanceId)
	current.busy = true
	current.error = ''
	current.result = null
	const request = hostedSync(instanceId)
		.then((result) => {
			current.result = result
			return result
		})
		.catch((error) => {
			current.error = String(error)
			throw error
		})
		.finally(() => {
			current.busy = false
			inFlight.delete(instanceId)
		})
	inFlight.set(instanceId, request)
	return request
}

export function useHostedSync(instanceId: () => string) {
	const task = computed(() => {
		return getTask(instanceId())
	})

	async function sync() {
		const id = instanceId()
		if (task.value.busy) return undefined
		try {
			return await runHostedSync(id)
		} catch {
			return undefined
		}
	}

	return {
		busy: computed(() => task.value.busy),
		result: computed(() => task.value.result),
		error: computed(() => task.value.error),
		sync,
	}
}
