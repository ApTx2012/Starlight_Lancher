<script setup lang="ts">
import { ButtonStyled, useVIntl } from '@modrinth/ui'
import { onUnmounted, ref, watch } from 'vue'
import {
	chooseInstancePlayer,
	getInstancePlayer,
	onInstancePlayerChanged,
	type InstancePlayer,
} from '@/helpers/instance-player'
import { playerMessages as messages } from './instance-player-messages'

const { formatMessage } = useVIntl()

const props = defineProps<{ instanceId: string }>()
const player = ref<InstancePlayer | null>(null)
const busy = ref(false)
const error = ref('')
let generation = 0
const stop = onInstancePlayerChanged((id, saved) => {
	if (id === props.instanceId) {
		generation++
		player.value = saved
		busy.value = false
		error.value = ''
	}
})
onUnmounted(() => {
	generation++
	stop()
})
watch(
	() => props.instanceId,
	async (id) => {
		const revision = ++generation
		player.value = null
		error.value = ''
		busy.value = true
		try {
			const saved = await getInstancePlayer(id)
			if (generation === revision) player.value = saved
		} catch (cause) {
			if (generation === revision) error.value = String(cause)
		} finally {
			if (generation === revision) busy.value = false
		}
	},
	{ immediate: true },
)
async function change() {
	if (busy.value) return
	const revision = generation
	const id = props.instanceId
	busy.value = true
	error.value = ''
	try {
		const saved = await chooseInstancePlayer(id)
		if (generation === revision) player.value = saved
	} catch (cause) {
		if (generation === revision)
			error.value = cause instanceof Error ? cause.message : String(cause)
	} finally {
		if (generation === revision) busy.value = false
	}
}
</script>
<template>
	<div class="mb-6 flex flex-col gap-2" data-onboarding-id="instance-player-settings">
		<h3 class="m-0 text-contrast">{{ formatMessage(messages.setting) }}</h3>
		<p class="m-0 text-secondary">
			{{ player ? player.name : formatMessage(messages.firstLaunch) }}
		</p>
		<ButtonStyled
			><button :disabled="busy" @click="change">
				{{ formatMessage(busy ? messages.loading : messages.change) }}
			</button></ButtonStyled
		>
		<p v-if="error" class="m-0 text-red" role="alert">{{ error }}</p>
	</div>
</template>
