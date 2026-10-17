<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	type SkinSiteBugIssue,
	skinSiteBugIssues,
	type SkinSiteBugIssueType,
	type SkinSiteBugPriority,
	type SkinSiteBugStatus,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.bugs.title', defaultMessage: 'Bugs & suggestions' },
	back: { id: 'app.skin-site.bugs.back', defaultMessage: 'Back to home' },
	subtitle: {
		id: 'app.skin-site.bugs.subtitle',
		defaultMessage: 'Report issues and follow their progress.',
	},
	loading: { id: 'app.skin-site.bugs.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.bugs.failed', defaultMessage: 'Could not load issues.' },
	empty: { id: 'app.skin-site.bugs.empty', defaultMessage: 'No issues match these filters.' },
	all: { id: 'app.skin-site.bugs.all', defaultMessage: 'All' },
	more: { id: 'app.skin-site.bugs.more', defaultMessage: 'Load more' },
	openOnly: { id: 'app.skin-site.bugs.open-only', defaultMessage: 'Open only' },
	create: { id: 'app.skin-site.bugs.create', defaultMessage: 'New issue' },
	notifications: {
		id: 'app.skin-site.bugs.notifications',
		defaultMessage: 'Notifications',
	},
	comments: { id: 'app.skin-site.bugs.comments', defaultMessage: '{count} comments' },
	typeBug: { id: 'app.skin-site.bugs.type.bug', defaultMessage: 'Bug' },
	typeFeature: { id: 'app.skin-site.bugs.type.feature', defaultMessage: 'Feature' },
	typeImprovement: { id: 'app.skin-site.bugs.type.improvement', defaultMessage: 'Improvement' },
	statusPending: { id: 'app.skin-site.bugs.status.pending', defaultMessage: 'Pending' },
	statusConfirmed: { id: 'app.skin-site.bugs.status.confirmed', defaultMessage: 'Confirmed' },
	statusNeedsInfo: { id: 'app.skin-site.bugs.status.needs-info', defaultMessage: 'Needs info' },
	statusInProgress: { id: 'app.skin-site.bugs.status.in-progress', defaultMessage: 'In progress' },
	statusVerifying: { id: 'app.skin-site.bugs.status.verifying', defaultMessage: 'Verifying' },
	statusClosed: { id: 'app.skin-site.bugs.status.closed', defaultMessage: 'Closed' },
	priorityCritical: { id: 'app.skin-site.bugs.priority.critical', defaultMessage: 'Critical' },
	priorityHigh: { id: 'app.skin-site.bugs.priority.high', defaultMessage: 'High' },
	priorityNormal: { id: 'app.skin-site.bugs.priority.normal', defaultMessage: 'Normal' },
	priorityLow: { id: 'app.skin-site.bugs.priority.low', defaultMessage: 'Low' },
})
const emit = defineEmits<{
	(e: 'back' | 'create' | 'notifications'): void
	(e: 'open', id: number): void
}>()

const items = ref<SkinSiteBugIssue[]>([])
const hasMore = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const failed = ref(false)

const typeFilter = ref<SkinSiteBugIssueType | ''>('')
const statusFilter = ref<SkinSiteBugStatus | ''>('')
const priorityFilter = ref<SkinSiteBugPriority | ''>('')
const openOnly = ref(true)

const TYPE_OPTIONS: SkinSiteBugIssueType[] = ['BUG', 'FEATURE', 'IMPROVEMENT']
const STATUS_OPTIONS: SkinSiteBugStatus[] = [
	'PENDING',
	'CONFIRMED',
	'NEEDS_INFO',
	'IN_PROGRESS',
	'VERIFYING',
	'CLOSED',
]
const PRIORITY_OPTIONS: SkinSiteBugPriority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW']

function typeLabel(type: SkinSiteBugIssueType): string {
	switch (type) {
		case 'FEATURE':
			return formatMessage(messages.typeFeature)
		case 'IMPROVEMENT':
			return formatMessage(messages.typeImprovement)
		default:
			return formatMessage(messages.typeBug)
	}
}

function statusLabel(status: SkinSiteBugStatus): string {
	switch (status) {
		case 'CONFIRMED':
			return formatMessage(messages.statusConfirmed)
		case 'NEEDS_INFO':
			return formatMessage(messages.statusNeedsInfo)
		case 'IN_PROGRESS':
			return formatMessage(messages.statusInProgress)
		case 'VERIFYING':
			return formatMessage(messages.statusVerifying)
		case 'CLOSED':
			return formatMessage(messages.statusClosed)
		default:
			return formatMessage(messages.statusPending)
	}
}

function priorityLabel(priority: SkinSiteBugPriority): string {
	switch (priority) {
		case 'CRITICAL':
			return formatMessage(messages.priorityCritical)
		case 'HIGH':
			return formatMessage(messages.priorityHigh)
		case 'LOW':
			return formatMessage(messages.priorityLow)
		default:
			return formatMessage(messages.priorityNormal)
	}
}

function formatDate(ts: number): string {
	try {
		return new Date(ts).toLocaleDateString()
	} catch {
		return ''
	}
}

async function load(reset = true) {
	if (reset) {
		loading.value = true
		items.value = []
	} else {
		loadingMore.value = true
	}
	failed.value = false
	try {
		const result = await skinSiteBugIssues({
			offset: reset ? 0 : items.value.length,
			limit: 20,
			type: typeFilter.value || undefined,
			status: statusFilter.value || undefined,
			priority: priorityFilter.value || undefined,
			openOnly: openOnly.value,
		})
		if (!result.success) throw new Error(result.errorMessage)
		const page = result.payload
		items.value = reset ? page.items : [...items.value, ...page.items]
		hasMore.value = page.hasMore
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
		loadingMore.value = false
	}
}

function clearFilters() {
	typeFilter.value = ''
	statusFilter.value = ''
	priorityFilter.value = ''
	void load(true)
}

onMounted(() => load(true))
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

		<header class="flex flex-wrap items-start gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="m-0 text-xl font-bold text-contrast">{{ formatMessage(messages.title) }}</h1>
				<p class="m-0 text-sm text-secondary">{{ formatMessage(messages.subtitle) }}</p>
			</div>
			<div class="ml-auto flex items-center gap-2">
				<button
					type="button"
					class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-secondary hover:brightness-110"
					@click="emit('notifications')"
				>
					{{ formatMessage(messages.notifications) }}
				</button>
				<button
					type="button"
					class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
					@click="emit('create')"
				>
					{{ formatMessage(messages.create) }}
				</button>
			</div>
		</header>

		<div class="flex flex-wrap items-center gap-2">
			<select
				v-model="typeFilter"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
				@change="load(true)"
			>
				<option value="">{{ formatMessage(messages.all) }}</option>
				<option v-for="t in TYPE_OPTIONS" :key="t" :value="t">{{ typeLabel(t) }}</option>
			</select>
			<select
				v-model="statusFilter"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
				@change="load(true)"
			>
				<option value="">{{ formatMessage(messages.all) }}</option>
				<option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ statusLabel(s) }}</option>
			</select>
			<select
				v-model="priorityFilter"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
				@change="load(true)"
			>
				<option value="">{{ formatMessage(messages.all) }}</option>
				<option v-for="p in PRIORITY_OPTIONS" :key="p" :value="p">{{ priorityLabel(p) }}</option>
			</select>
			<label class="flex items-center gap-1.5 text-xs text-secondary">
				<input v-model="openOnly" type="checkbox" @change="load(true)" />
				{{ formatMessage(messages.openOnly) }}
			</label>
			<button
				type="button"
				class="ml-auto rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-secondary hover:brightness-110"
				@click="clearFilters"
			>
				{{ formatMessage(messages.all) }}
			</button>
		</div>

		<div v-if="loading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p v-else-if="failed" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
		</p>
		<p v-else-if="!items.length" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="flex flex-col gap-2">
			<div
				v-for="issue in items"
				:key="issue.id"
				class="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-solid border-surface-5 bg-bg-raised p-3 hover:border-brand"
				@click="emit('open', issue.id)"
			>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
					>
						{{ typeLabel(issue.type) }}
					</span>
					<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
						#{{ issue.id }} {{ issue.title }}
					</span>
					<span
						class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
						:class="{
							'bg-green text-contrast':
								issue.status === 'CONFIRMED' || issue.status === 'VERIFYING',
							'bg-yellow text-contrast':
								issue.status === 'NEEDS_INFO' || issue.status === 'IN_PROGRESS',
							'bg-button-bg text-secondary': issue.status === 'PENDING',
							'bg-surface-5 text-secondary': issue.status === 'CLOSED',
						}"
					>
						{{ statusLabel(issue.status) }}
					</span>
					<span
						class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
						:class="{
							'bg-red text-contrast': issue.priority === 'CRITICAL',
							'bg-orange text-contrast': issue.priority === 'HIGH',
							'bg-button-bg text-secondary':
								issue.priority === 'NORMAL' || issue.priority === 'LOW',
						}"
					>
						{{ priorityLabel(issue.priority) }}
					</span>
				</div>
				<div class="flex flex-wrap items-center gap-3 text-xs text-secondary">
					<span>{{ issue.authorName }}</span>
					<span>{{ formatDate(issue.createdAt) }}</span>
					<span>{{ formatMessage(messages.comments, { count: issue.commentCount }) }}</span>
					<span v-if="issue.assigneeName">→ {{ issue.assigneeName }}</span>
				</div>
			</div>

			<button
				v-if="hasMore"
				type="button"
				class="w-fit self-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast disabled:opacity-50"
				:disabled="loadingMore"
				@click="load(false)"
			>
				{{ formatMessage(messages.more) }}
			</button>
		</div>
	</div>
</template>
