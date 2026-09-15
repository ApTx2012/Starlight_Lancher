<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { useId } from 'vue'

import type { InstanceMode } from '@/helpers/hosted-packs'

defineProps<{ modelValue?: InstanceMode; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: InstanceMode] }>()
const group = useId()
const { formatMessage } = useVIntl()
const messages = defineMessages({
	title: { id: 'app.instance-mode.title', defaultMessage: 'Instance type' },
	starlight: { id: 'app.instance-mode.starlight', defaultMessage: 'StarLight instance' },
	local: { id: 'app.instance-mode.local', defaultMessage: 'Local instance' },
	starlightDescription: {
		id: 'app.instance-mode.starlight-description',
		defaultMessage:
			'Required for playing on StarLight. Automatically installs the server-selected modpack, Minecraft version, and loader. Every launch requires a StarLight login and checks for updates before starting.',
	},
	localDescription: {
		id: 'app.instance-mode.local-description',
		defaultMessage:
			'Does not sync StarLight server changes. Skips sync checks for faster startup and lets you choose your own modpacks. Best for third-party servers and personal single-player worlds.',
	},
})
</script>
<template>
	<fieldset class="m-0 flex flex-col gap-3 border-0 p-0" :disabled="disabled">
		<legend class="mb-3 text-lg font-semibold text-contrast">
			{{ formatMessage(messages.title) }}
		</legend>
		<label
			v-for="mode in ['starlight', 'local'] as const"
			:key="mode"
			class="flex items-start gap-3 rounded-xl border border-solid border-divider p-4"
			:class="[
				modelValue === mode ? 'bg-surface-3' : 'bg-surface-1',
				disabled ? 'opacity-60' : 'cursor-pointer',
			]"
		>
			<input
				type="radio"
				class="mt-1"
				:name="group"
				:value="mode"
				:checked="modelValue === mode"
				@change="emit('update:modelValue', mode)"
			/>
			<span class="flex flex-col gap-1"
				><span class="font-semibold text-contrast">{{ formatMessage(messages[mode]) }}</span
				><span class="text-sm text-secondary">{{
					formatMessage(
						mode === 'starlight' ? messages.starlightDescription : messages.localDescription,
					)
				}}</span></span
			>
		</label>
	</fieldset>
</template>
