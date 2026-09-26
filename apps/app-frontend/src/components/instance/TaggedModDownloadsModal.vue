<script setup lang="ts">
import { ButtonStyled, defineMessages, NewModal, ProgressBar, useVIntl } from '@modrinth/ui'
import { nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

import { loading_listener } from '@/helpers/events'
import { onHostedPackAttemptStarted } from '@/helpers/hosted-packs'
import { progress_bars_list } from '@/helpers/state'
import {
	createTaggedModProgress,
	type TaggedProgressEvent,
	type TaggedProgressGroup,
} from '@/helpers/tagged-mod-progress'

const modal = ref<InstanceType<typeof NewModal>>()
const router = useRouter()
const { formatMessage } = useVIntl()
const state = createTaggedModProgress()
const groups = shallowRef<TaggedProgressGroup[]>([])
const messages = defineMessages({
	title: { id: 'app.hosted-mods.title', defaultMessage: 'Updating server Mods' },
	description: {
		id: 'app.hosted-mods.description',
		defaultMessage: 'The game starts after all required updates have been installed.',
	},
	complete: { id: 'app.hosted-mods.complete', defaultMessage: 'Downloaded' },
	downloads: { id: 'app.hosted-mods.downloads', defaultMessage: 'View downloads' },
	close: { id: 'app.hosted-mods.close', defaultMessage: 'Close' },
})
const size = (value: number) => `${(value / 1048576).toFixed(1)} MiB`
let disposed = false
let unlisten: (() => void) | undefined
let stopAttempts: (() => void) | undefined
function refresh() {
	groups.value = [...state.groups.values()]
}
function consume(payload: TaggedProgressEvent) {
	const opened = state.update(payload)
	refresh()
	if (opened)
		void nextTick(() => {
			const group = state.groups.get(payload.event?.batch_id ?? '')
			if (!disposed && group && (!group.done || group.error)) modal.value?.show()
		})
	if (groups.value.length > 0 && groups.value.every((group) => group.done && !group.error))
		modal.value?.hide()
}
onMounted(async () => {
	stopAttempts = onHostedPackAttemptStarted((id) => {
		state.reset(id)
		refresh()
		if (!groups.value.length) modal.value?.hide()
	})
	let initializing = true
	const buffered: TaggedProgressEvent[] = []
	const stop = await loading_listener((payload: TaggedProgressEvent) => {
		if (initializing) buffered.push(payload)
		else consume(payload)
	})
	if (disposed) {
		stop()
		return
	}
	unlisten = stop
	const bars = await progress_bars_list().catch(() => ({}))
	if (disposed) return
	const ordered = Object.values(bars).sort(
		(a, b) =>
			Number(b.bar_type?.type === 'hosted_pack_sync') -
			Number(a.bar_type?.type === 'hosted_pack_sync'),
	)
	for (const bar of ordered)
		consume({
			loader_uuid: String(bar.loading_bar_uuid),
			event: bar.bar_type,
			fraction: bar.total ? (bar.current ?? 0) / bar.total : 0,
			total: bar.total,
			message: bar.message ?? '',
		})
	initializing = false
	for (const payload of buffered) consume(payload)
})
onUnmounted(() => {
	disposed = true
	unlisten?.()
	stopAttempts?.()
})
function openDownloads() {
	modal.value?.hide()
	void router.push('/downloads')
}
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.title)"
		width="min(38rem, calc(100vw - 2rem))"
		scrollable
		max-content-height="60vh"
		:close-on-click-outside="false"
	>
		<div class="flex flex-col gap-4">
			<p class="m-0 text-secondary">{{ formatMessage(messages.description) }}</p>
			<section v-for="group in groups" :key="group.id" class="flex min-w-0 flex-col gap-3">
				<h3 class="m-0 text-contrast">{{ group.name }}</h3>
				<p v-if="group.error" role="alert" class="m-0 break-words text-red">{{ group.error }}</p>
				<p v-else-if="group.message" class="m-0 break-words text-sm text-secondary">
					{{ group.message }}
				</p>
				<div
					v-for="file in group.files.values()"
					:key="file.id"
					class="flex min-w-0 flex-col gap-1"
				>
					<div class="flex flex-wrap justify-between gap-2 text-sm">
						<span class="min-w-0 break-all text-contrast">{{ file.name }}</span>
						<span class="text-secondary tabular-nums"
							>{{ size(file.current) }} / {{ size(file.total) }}</span
						>
					</div>
					<p v-if="file.error" class="m-0 break-words text-sm text-red">{{ file.error }}</p>
					<ProgressBar
						v-else
						:progress="file.current"
						:max="file.total || 1"
						:waiting="!file.total"
						:show-progress="!file.done"
						:label="file.done ? formatMessage(messages.complete) : file.message"
						full-width
						><template #progress-icon
					/></ProgressBar>
				</div>
			</section>
		</div>
		<template #actions>
			<div class="flex w-full items-center justify-between gap-2">
				<ButtonStyled>
					<button @click="openDownloads">
						{{ formatMessage(messages.downloads) }}
					</button>
				</ButtonStyled>
				<ButtonStyled>
					<button @click="modal?.hide()">
						{{ formatMessage(messages.close) }}
					</button>
				</ButtonStyled>
			</div>
		</template>
	</NewModal>
</template>
