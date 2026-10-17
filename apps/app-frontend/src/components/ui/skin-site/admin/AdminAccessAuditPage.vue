<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	skinSiteAccessAudit,
	type SkinSiteAccessAuditEntry,
	skinSiteUpdateAccessAuditSettings,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.audit.title', defaultMessage: 'Access audit' },
	loading: { id: 'app.skin-site.admin.audit.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.admin.audit.failed', defaultMessage: 'Could not load audit log.' },
	empty: { id: 'app.skin-site.admin.audit.empty', defaultMessage: 'No audit entries.' },
	subject: { id: 'app.skin-site.admin.audit.subject', defaultMessage: 'Subject' },
	action: { id: 'app.skin-site.admin.audit.action', defaultMessage: 'Action' },
	sourceIp: { id: 'app.skin-site.admin.audit.source-ip', defaultMessage: 'Source IP' },
	reportedIp: {
		id: 'app.skin-site.admin.audit.reported-ip',
		defaultMessage: 'Reported player IP',
	},
	count: { id: 'app.skin-site.admin.audit.count', defaultMessage: 'Count' },
	firstAt: { id: 'app.skin-site.admin.audit.first-at', defaultMessage: 'First seen' },
	lastAt: { id: 'app.skin-site.admin.audit.last-at', defaultMessage: 'Last seen' },
	proxy: { id: 'app.skin-site.admin.audit.proxy', defaultMessage: 'Proxy' },
	internal: { id: 'app.skin-site.admin.audit.internal', defaultMessage: 'Internal' },
	searchSubject: {
		id: 'app.skin-site.admin.audit.search-subject',
		defaultMessage: 'Subject',
	},
	searchIp: { id: 'app.skin-site.admin.audit.search-ip', defaultMessage: 'IP' },
	searchAction: { id: 'app.skin-site.admin.audit.search-action', defaultMessage: 'Action' },
	search: { id: 'app.skin-site.admin.audit.search', defaultMessage: 'Search' },
	clear: { id: 'app.skin-site.admin.audit.clear', defaultMessage: 'Clear' },
	loadMore: { id: 'app.skin-site.admin.audit.load-more', defaultMessage: 'Load more' },
	retention: {
		id: 'app.skin-site.admin.audit.retention',
		defaultMessage: 'Retention (days)',
	},
	recordLimit: { id: 'app.skin-site.admin.audit.record-limit', defaultMessage: 'Record limit' },
	saveRetention: {
		id: 'app.skin-site.admin.audit.save-retention',
		defaultMessage: 'Save',
	},
	retentionSaved: {
		id: 'app.skin-site.admin.audit.retention-saved',
		defaultMessage: 'Retention updated.',
	},
})

const items = ref<SkinSiteAccessAuditEntry[]>([])
const nextCursor = ref<number | null>(null)
const retentionDays = ref(0)
const recordLimit = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const failed = ref(false)

const subjectFilter = ref('')
const ipFilter = ref('')
const actionFilter = ref('')

const retentionDraft = ref(0)
const savingRetention = ref(false)

function formatDateTime(ts: number): string {
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ''
	}
}

async function load(reset = true) {
	if (reset) {
		loading.value = true
		items.value = []
		nextCursor.value = null
	} else {
		loadingMore.value = true
	}
	failed.value = false
	try {
		const result = await skinSiteAccessAudit({
			before: reset ? undefined : (nextCursor.value ?? undefined),
			subject: subjectFilter.value.trim() || undefined,
			ip: ipFilter.value.trim() || undefined,
			action: actionFilter.value.trim() || undefined,
		})
		if (!result.success) throw new Error(result.errorMessage)
		const page = result.payload
		items.value = reset ? page.items : [...items.value, ...page.items]
		nextCursor.value = page.nextCursor
		retentionDays.value = page.retentionDays
		recordLimit.value = page.recordLimit
		retentionDraft.value = page.retentionDays
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
		loadingMore.value = false
	}
}

function clearFilters() {
	subjectFilter.value = ''
	ipFilter.value = ''
	actionFilter.value = ''
	void load(true)
}

async function saveRetention() {
	if (savingRetention.value) return
	savingRetention.value = true
	try {
		const result = await skinSiteUpdateAccessAuditSettings(Number(retentionDraft.value) || 0)
		if (!result.success) throw new Error(result.errorMessage)
		retentionDays.value = result.payload.retentionDays
		retentionDraft.value = result.payload.retentionDays
		addNotification({ type: 'success', title: formatMessage(messages.retentionSaved) })
	} catch (error) {
		handleError(error)
	} finally {
		savingRetention.value = false
	}
}

onMounted(() => void load(true))
</script>
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<span class="text-xs text-secondary">
				{{ formatMessage(messages.recordLimit) }}: {{ recordLimit }}
			</span>
		</div>

		<div class="flex flex-wrap items-end gap-2">
			<label class="flex flex-col gap-1">
				<span class="text-xs text-secondary">{{ formatMessage(messages.searchSubject) }}</span>
				<input
					v-model="subjectFilter"
					type="text"
					class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
					@keyup.enter="load(true)"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs text-secondary">{{ formatMessage(messages.searchIp) }}</span>
				<input
					v-model="ipFilter"
					type="text"
					class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
					@keyup.enter="load(true)"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs text-secondary">{{ formatMessage(messages.searchAction) }}</span>
				<input
					v-model="actionFilter"
					type="text"
					class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
					@keyup.enter="load(true)"
				/>
			</label>
			<button
				type="button"
				class="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
				@click="load(true)"
			>
				{{ formatMessage(messages.search) }}
			</button>
			<button
				type="button"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-secondary hover:brightness-110"
				@click="clearFilters"
			>
				{{ formatMessage(messages.clear) }}
			</button>
		</div>

		<div class="flex flex-wrap items-end gap-2 rounded-xl bg-bg-raised p-3">
			<label class="flex flex-col gap-1">
				<span class="text-xs text-secondary">{{ formatMessage(messages.retention) }}</span>
				<input
					v-model.number="retentionDraft"
					type="number"
					min="1"
					class="w-24 rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
				/>
			</label>
			<button
				type="button"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
				:disabled="savingRetention"
				@click="saveRetention"
			>
				{{ formatMessage(messages.saveRetention) }}
			</button>
			<span class="text-xs text-secondary">
				{{ formatMessage(messages.retention) }}: {{ retentionDays }}
			</span>
		</div>

		<div v-if="loading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p v-else-if="failed" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
		</p>
		<p v-else-if="!items.length" class="m-0 rounded-xl bg-bg-raised p-4 text-sm text-secondary">
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="flex flex-col gap-2">
			<div
				v-for="entry in items"
				:key="entry.id"
				class="flex flex-col gap-1.5 rounded-xl bg-bg-raised p-3"
			>
				<div class="flex flex-wrap items-center gap-2">
					<span class="shrink-0 text-xs text-secondary">#{{ entry.id }}</span>
					<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
						{{ entry.subject }}
					</span>
					<span
						class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
					>
						{{ entry.action }}
					</span>
					<span class="shrink-0 text-xs text-secondary">×{{ entry.count }}</span>
					<span
						v-if="entry.proxy"
						class="shrink-0 rounded-full bg-orange px-2 py-0.5 text-[10px] font-semibold text-contrast"
					>
						{{ formatMessage(messages.proxy) }}
					</span>
					<span
						v-if="entry.internalServer"
						class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
					>
						{{ formatMessage(messages.internal) }}
					</span>
				</div>
				<div class="flex flex-wrap items-center gap-3 text-xs text-secondary">
					<span>{{ formatMessage(messages.sourceIp) }}: {{ entry.sourceIp }}</span>
					<span v-if="entry.reportedPlayerIp">
						{{ formatMessage(messages.reportedIp) }}: {{ entry.reportedPlayerIp }}
					</span>
					<span>{{ formatMessage(messages.firstAt) }}: {{ formatDateTime(entry.firstAt) }}</span>
					<span>{{ formatMessage(messages.lastAt) }}: {{ formatDateTime(entry.lastAt) }}</span>
				</div>
			</div>

			<button
				v-if="nextCursor !== null"
				type="button"
				class="w-fit self-center rounded-full bg-button-bg px-4 py-2 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
				:disabled="loadingMore"
				@click="load(false)"
			>
				{{ formatMessage(messages.loadMore) }}
			</button>
		</div>
	</div>
</template>
