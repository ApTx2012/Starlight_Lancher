import { computed, reactive } from 'vue'
import { hostedSync, type HostedSyncResult } from '../helpers/hosted-packs.ts'

const tasks = reactive(
	new Map<string, { busy: boolean; result: HostedSyncResult | null; error: string }>(),
)

export function useHostedSync(instanceId: () => string) {
	const task = computed(() => {
		const id = instanceId()
		if (!tasks.has(id)) tasks.set(id, { busy: false, result: null, error: '' })
		return tasks.get(id)!
	})

	async function sync() {
		const id = instanceId()
		const current = task.value
		if (current.busy) return
		current.busy = true
		current.error = ''
		current.result = null
		try {
			current.result = await hostedSync(id)
		} catch (error) {
			current.error = String(error)
		} finally {
			current.busy = false
		}
	}

	return {
		busy: computed(() => task.value.busy),
		result: computed(() => task.value.result),
		error: computed(() => task.value.error),
		sync,
	}
}
