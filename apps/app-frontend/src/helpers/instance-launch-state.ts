import { reactive } from 'vue'

const pending = reactive(new Map<string, Promise<unknown>>())

export function isInstanceLaunching(instanceId: string) {
	return pending.has(instanceId)
}

/** Coalesce repeated clicks for one launch without blocking other instances. */
export function launchOnce<T>(instanceId: string, launch: () => Promise<T>): Promise<T> {
	const existing = pending.get(instanceId)
	if (existing) return existing as Promise<T>
	const task = Promise.resolve()
		.then(launch)
		.finally(() => {
			pending.delete(instanceId)
		})
	pending.set(instanceId, task)
	return task
}
