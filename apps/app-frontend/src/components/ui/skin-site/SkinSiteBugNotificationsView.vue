<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	type SkinSiteBugNotification,
	skinSiteBugNotifications,
	skinSiteMarkBugNotificationRead,
} from '@/helpers/skin-site-api'

const emit = defineEmits<{ (e: 'back'): void; (e: 'open', id: number): void }>()

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.bug-notifications.title', defaultMessage: 'Notifications' },
	back: { id: 'app.skin-site.bug-notifications.back', defaultMessage: 'Back to home' },
	subtitle: {
		id: 'app.skin-site.bug-notifications.subtitle',
		defaultMessage: 'Activity on issues you reported or follow.',
	},
	loading: { id: 'app.skin-site.bug-notifications.loading', defaultMessage: 'Loading…' },
	failed: {
		id: 'app.skin-site.bug-notifications.failed',
		defaultMessage: 'Could not load notifications.',
	},
	empty: { id: 'app.skin-site.bug-notifications.empty', defaultMessage: 'No new notifications.' },
	item: {
		id: 'app.skin-site.bug-notifications.item',
		defaultMessage: '{name} updated issue #{id}',
	},
	markAll: {
		id: 'app.skin-site.bug-notifications.mark-all',
		defaultMessage: 'Mark all as read',
	},
	markedAll: {
		id: 'app.skin-site.bug-notifications.marked-all',
		defaultMessage: 'All notifications marked as read.',
	},
})

const items = ref<SkinSiteBugNotification[]>([])
const loading = ref(true)
const failed = ref(false)
const marking = ref(false)

function formatDateTime(ts: number): string {
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ''
	}
}

async function load() {
	loading.value = true
	failed.value = false
	try {
		const result = await skinSiteBugNotifications()
		if (!result.success) throw new Error(result.errorMessage)
		items.value = result.payload ?? []
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
	}
}

async function markAllRead() {
	if (marking.value || !items.value.length) return
	marking.value = true
	try {
		await skinSiteMarkBugNotificationRead()
		items.value = []
	} catch (error) {
		handleError(error)
	} finally {
		marking.value = false
	}
}

onMounted(() => void load())
</script>
<template>
	<div class="flex flex-col gap-4">
		<button
			type="button"
			class="flex w-fit items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
			@click="emit('back')"
		>
			← {{ formatMessage(messages.back) }}
		</button>

		<header class="flex flex-wrap items-center gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="m-0 text-xl font-bold text-contrast">{{ formatMessage(messages.title) }}</h1>
				<p class="m-0 text-sm text-secondary">{{ formatMessage(messages.subtitle) }}</p>
			</div>
			<button
				v-if="items.length"
				type="button"
				class="ml-auto rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-secondary hover:brightness-110 disabled:opacity-50"
				:disabled="marking"
				@click="markAllRead"
			>
				{{ formatMessage(messages.markAll) }}
			</button>
		</header>

		<div v-if="loading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p v-else-if="failed" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
		</p>
		<p
			v-else-if="!items.length"
			class="m-0 rounded-xl border border-solid border-surface-5 bg-bg-raised p-4 text-sm text-secondary"
		>
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="flex flex-col gap-2">
			<div
				v-for="item in items"
				:key="item.id"
				class="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-solid border-surface-5 bg-bg-raised p-3 hover:border-brand"
				@click="emit('open', item.issueId)"
			>
				<span class="min-w-0 flex-1 truncate text-sm text-contrast">
					{{ formatMessage(messages.item, { name: item.actorName, id: item.issueId }) }}
				</span>
				<span class="shrink-0 text-xs text-secondary">{{ formatDateTime(item.createdAt) }}</span>
			</div>
		</div>
	</div>
</template>
