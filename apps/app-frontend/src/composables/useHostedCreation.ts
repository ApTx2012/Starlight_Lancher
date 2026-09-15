import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { hostedCreate, hostedSync } from '../helpers/hosted-packs.ts'

const installing = ref(false)
const installError = ref('')
const createdInstance = ref<string>()
const completed = ref(false)
let generation = 0

export function forgetHostedCreation(instanceId: string) {
	if (createdInstance.value !== instanceId) return
	generation++
	createdInstance.value = undefined
	completed.value = false
	installError.value = ''
}

export function useHostedCreation() {
	function acknowledge(instanceId: string) {
		if (completed.value && createdInstance.value === instanceId) {
			createdInstance.value = undefined
			completed.value = false
		}
	}
	async function install() {
		if (installing.value) return
		installing.value = true
		installError.value = ''
		const attempt = generation
		try {
			if (createdInstance.value) {
				const instance = await invoke<unknown | null>('plugin:instance|instance_get', {
					instanceId: createdInstance.value,
				})
				if (attempt !== generation) return
				if (!instance) {
					createdInstance.value = undefined
					completed.value = false
				}
			}
			if (completed.value) return createdInstance.value
			createdInstance.value ??= await hostedCreate()
			const instanceId = createdInstance.value
			await hostedSync(instanceId)
			if (attempt !== generation) return
			completed.value = true
			return instanceId
		} catch (cause) {
			if (attempt === generation) installError.value = String(cause)
		} finally {
			installing.value = false
		}
	}
	return { installing, installError, createdInstance, completed, acknowledge, install }
}
