<script setup lang="ts">
import { DownloadIcon } from '@modrinth/assets'
import { defineMessages, ProgressBar, useVIntl } from '@modrinth/ui'
import { computed, onUnmounted, ref } from 'vue'

import { loading_listener } from '@/helpers/events'
import type { LoadingBar } from '@/helpers/state'
import { progress_bars_list } from '@/helpers/state'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: { id: 'app.home.launch-progress.title', defaultMessage: '启动进度' },
	empty: { id: 'app.home.launch-progress.empty', defaultMessage: '启动游戏后，这里会显示进度。' },
})

interface LoadingEventPayload {
	total?: number | null
	event: LoadingBar['bar_type']
	loader_uuid: string
	fraction: number | null
	message: string
}

interface LaunchProgressItem {
	waiting: boolean
	key: string
	message: string
	fraction: number | null
}

// 启动相关（以及准备）阶段会发的 loading 类型；安装/下载也一并显示，便于用户看到进度
const LAUNCH_BAR_TYPES = new Set([
	'hosted_pack_sync',
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
		waiting: payload.total === 0,
		key: payload.loader_uuid,
		message: payload.message,
		fraction: payload.fraction,
	})
	progressItems.value = Array.from(activeMap.values())
}

const hasProgress = computed(() => progressItems.value.length > 0)

function percent(item: LaunchProgressItem): string {
	if (item.waiting || item.fraction == null || !Number.isFinite(item.fraction)) return ''
	return `${Math.round(Math.max(0, Math.min(1, item.fraction)) * 100)}%`
}

let initializing = true
const buffered: LoadingEventPayload[] = []
const unlistenLoading = await loading_listener((payload: LoadingEventPayload) => {
	if (initializing) buffered.push(payload)
	else applyEvent(payload)
})
const bars = await progress_bars_list().catch(() => ({}))
for (const bar of Object.values(bars)) {
	applyEvent({
		event: bar.bar_type,
		loader_uuid: String(bar.loading_bar_uuid),
		fraction: bar.total ? (bar.current ?? 0) / bar.total : 0,
		total: bar.total,
		message: bar.message ?? '',
	})
}
initializing = false
for (const payload of buffered) applyEvent(payload)

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
				<ProgressBar :progress="item.fraction ?? 0" :waiting="item.waiting" full-width />
			</li>
		</ul>
	</section>
</template>
