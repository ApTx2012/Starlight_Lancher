<script setup lang="ts">
import { defineMessages, ProgressBar, useVIntl } from '@modrinth/ui'
import { computed } from 'vue'

import { injectDownloadManager } from '@/providers/download-manager'

const props = defineProps<{ instanceId?: string; active?: boolean }>()
const manager = injectDownloadManager()
const { formatMessage } = useVIntl()
const messages = defineMessages({
	preparing: {
		id: 'app.hosted-packs.progress.preparing',
		defaultMessage: 'Preparing modpack installation…',
	},
	downloads: { id: 'app.hosted-packs.progress.downloads', defaultMessage: 'View downloads' },
})
const bar = computed(() =>
	manager.legacyDownloads.value.find(
		(item) =>
			props.instanceId &&
			item.bar_type?.type === 'hosted_pack_sync' &&
			!item.bar_type.error &&
			item.bar_type.instance_id === props.instanceId,
	),
)
const waiting = computed(() => !bar.value?.total)
const current = computed(() =>
	Math.max(0, Math.min(bar.value?.current ?? 0, bar.value?.total ?? 0)),
)
const message = computed(() => bar.value?.message || formatMessage(messages.preparing))
</script>

<template>
	<div v-if="active || bar" class="flex min-w-0 flex-col gap-2" role="status">
		<ProgressBar
			:progress="current"
			:max="bar?.total || 1"
			:waiting="waiting"
			:label="message"
			label-class="min-w-0 break-all text-sm text-secondary"
			:show-progress="!waiting"
			full-width
		>
			<template #progress-icon />
		</ProgressBar>
		<RouterLink to="/downloads" class="self-start text-sm text-brand hover:underline">
			{{ formatMessage(messages.downloads) }}
		</RouterLink>
	</div>
</template>
