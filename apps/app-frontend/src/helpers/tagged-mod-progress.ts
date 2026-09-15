import type { LoadingBarType } from './state.ts'

export interface TaggedProgressEvent {
	loader_uuid: string
	event?: LoadingBarType
	fraction: number | null
	total?: number | null
	message: string
}
export interface TaggedProgressFile {
	id: string
	name: string
	current: number
	total: number
	message: string
	done: boolean
	error: string
}
export interface TaggedProgressGroup {
	id: string
	instanceId: string
	name: string
	message: string
	error: string
	done: boolean
	files: Map<string, TaggedProgressFile>
}

export function createTaggedModProgress() {
	const groups = new Map<string, TaggedProgressGroup>()
	const parents = new Map<string, string>()
	const retiredParents = new Set<string>()
	const retired = new Set<string>()
	function reset(instanceId: string) {
		const parent = parents.get(instanceId)
		if (parent) retiredParents.add(parent)
		parents.delete(instanceId)
		for (const [id, group] of groups) {
			if (group.instanceId === instanceId) {
				retired.add(id)
				groups.delete(id)
			}
		}
	}
	function update(payload: TaggedProgressEvent): boolean {
		const event = payload.event
		if (!event?.instance_id) return false
		if (event.type === 'hosted_pack_sync') {
			if (retiredParents.has(payload.loader_uuid)) return false
			if (payload.fraction !== null && parents.get(event.instance_id) !== payload.loader_uuid) {
				reset(event.instance_id)
				parents.set(event.instance_id, payload.loader_uuid)
			}
			if (parents.get(event.instance_id) !== payload.loader_uuid) return false
			for (const group of groups.values()) {
				if (group.instanceId !== event.instance_id) continue
				if (group.done) continue
				group.message = payload.message
				if (payload.fraction === null) {
					group.done = true
					group.error = event.error ?? ''
				}
			}
			return false
		}
		if (event.type !== 'hosted_mod_download' || !event.batch_id || retired.has(event.batch_id))
			return false
		let group = groups.get(event.batch_id)
		const isNew = !group
		if (!group) {
			group = {
				id: event.batch_id,
				instanceId: event.instance_id,
				name: event.instance_name ?? '',
				message: '',
				error: '',
				done: false,
				files: new Map(),
			}
			groups.set(group.id, group)
		}
		const previous = group.files.get(payload.loader_uuid)
		if (previous?.done) return false
		const total = Math.max(0, payload.total ?? previous?.total ?? 0)
		group.files.set(payload.loader_uuid, {
			id: payload.loader_uuid,
			name: event.file_name ?? '',
			total,
			current:
				payload.fraction === null
					? event.error
						? (previous?.current ?? 0)
						: total
					: Math.max(0, Math.min(1, payload.fraction)) * total,
			message: payload.message,
			done: payload.fraction === null,
			error: event.error ?? '',
		})
		return isNew
	}
	return { groups, reset, update }
}
