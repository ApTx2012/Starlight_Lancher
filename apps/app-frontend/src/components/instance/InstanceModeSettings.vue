<script setup lang="ts">
import { ButtonStyled, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, watch } from 'vue'

import InstanceModeOptions from '@/components/instance/InstanceModeOptions.vue'
import { useInstanceMode, useSetInstanceMode } from '@/composables/useInstanceMode'
import type { InstanceMode } from '@/helpers/hosted-packs'

const props = defineProps<{ instanceId: string; disabled?: boolean }>()
const query = useInstanceMode(() => props.instanceId)
const save = useSetInstanceMode()
const { formatMessage } = useVIntl()
const messages = defineMessages({
	saving: { id: 'app.instance-mode.saving', defaultMessage: 'Saving instance type…' },
	loading: { id: 'app.instance-mode.loading', defaultMessage: 'Loading instance type…' },
	retry: { id: 'app.instance-mode.retry', defaultMessage: 'Retry' },
})
const saving = computed(
	() => save.isPending.value && save.variables.value?.instanceId === props.instanceId,
)
const selection = computed(() => (saving.value ? save.variables.value?.mode : query.data.value))
const failure = computed(
	() =>
		query.error.value ??
		(save.variables.value?.instanceId === props.instanceId ? save.error.value : null),
)
function select(mode: InstanceMode) {
	if (props.disabled || saving.value || !query.data.value || query.data.value === mode) return
	save.mutate({ instanceId: props.instanceId, mode })
}
function retry() {
	if (props.disabled || saving.value) return
	if (query.error.value) void query.refetch()
	else if (save.variables.value?.instanceId === props.instanceId) save.mutate(save.variables.value)
}
watch(
	() => props.instanceId,
	() => save.reset(),
)
</script>
<template>
	<div class="flex flex-col gap-3">
		<InstanceModeOptions
			:model-value="selection"
			:disabled="disabled || !query.data.value || query.isPending.value || saving"
			@update:model-value="select"
		/>
		<p v-if="query.isPending.value || saving" class="m-0 text-secondary" role="status">
			{{ formatMessage(saving ? messages.saving : messages.loading) }}
		</p>
		<div v-if="failure" role="alert" class="flex items-center gap-3">
			<span>{{ String(failure) }}</span
			><ButtonStyled
				><button
					type="button"
					:disabled="disabled || query.isFetching.value || saving"
					@click="retry"
				>
					{{ formatMessage(messages.retry) }}
				</button></ButtonStyled
			>
		</div>
	</div>
</template>
