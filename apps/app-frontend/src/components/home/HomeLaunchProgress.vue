
<script setup lang="ts">
import { DownloadIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onUnmounted, ref } from 'vue'

import { loading_listener } from '@/helpers/events'
import type { LoadingBar } from '@/helpers/state'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: { id: 'app.home.launch-progress.title', defaultMessage: '启动进度' },
	empty: { id: 'app.home.launch-progress.empty', defaultMessage: '启动游戏后，这里会显示进度。' },
})

interface LoadingEventPayload {
	event: LoadingBar['bar_type']
	loader_uuid: string
	fraction: number | null
	message: string
}

interface LaunchProgressItem {
	key: string
	message: string
	fraction: number | null
}

// 启动相关（以及准备）阶段会发的 loading 类型；安装/下载也一并显示，便于用户看到进度
const LAUNCH_BAR_TYPES = new Set([
	'minecraft_download',
	'instance_update',
	'zip_extract',
	'pack_download',
	'pack_file_download',
])

const progressItems = ref<LaunchProgressItem[]>([])
const activeMap = new Map<string, LaunchProgressItem>()

function isVisible(barType: LoadingBar['bar_type']): boolean {
	const type = barType?.type ?? ''
	return LAUNCH_BAR_TYPES.has(type)
}

function applyEvent(payload: LoadingEventPayload) {
	// fraction 为 null 约定为「完成」，移除该进度条
	if (payload.fraction === null) {
		activeMap.delete(payload.loader_uuid)
		progressItems.value = Array.from(activeMap.values())
		return
	}
	if (!isVisible(payload.event)) return

	activeMap.set(payload.loader_uuid, {
		key: payload.loader_uuid,
		message: payload.message,
		fraction: payload.fraction,
	})
	progressItems.value = Array.from(activeMap.values())
}

const hasProgress = computed(() => progressItems.value.length > 0)

function percent(item: LaunchProgressItem): string {
	if (item.fraction == null || !Number.isFinite(item.fraction)) return ''
	return `${Math.round(Math.max(0, Math.min(1, item.fraction)) * 100)}%`
}

const unlistenLoading = await loading_listener((payload: LoadingEventPayload) => {
	applyEvent(payload)
})

onUnmounted(() => {
	unlistenLoading?.()
})
</script>

<template>
	<section
		v-if="hasProgress"
		class="flex min-w-0 flex-col gap-3 border-0 border-b-[1px] border-solid border-[--brand-gradient-border] p-4"
	>
		<div class="flex items-center gap-2">
			<DownloadIcon class="size-4 shrink-0 text-secondary" aria-hidden="true" />
			<h2 class="m-0 truncate text-lg">
				{{ formatMessage(messages.title) }}
			</h2>
		</div>
		<ul class="m-0 flex list-none flex-col gap-2 p-0">
			<li v-for="item in progressItems" :key="item.key" class="flex min-w-0 flex-col gap-1">
				<div class="flex min-w-0 items-center justify-between gap-2 text-sm text-primary">
					<span class="min-w-0 truncate">{{ item.message }}</span>
					<span v-if="percent(item)" class="shrink-0 tabular-nums text-secondary">
						{{ percent(item) }}
					</span>
				</div>
				<div class="h-1 w-full overflow-hidden rounded-full bg-surface-4">
					<div
						class="h-full rounded-full bg-brand transition-[width] duration-200"
						:style="{ width: percent(item) || '100%' }"
					/>
				</div>
			</li>
		</ul>
	</section>
</template>
