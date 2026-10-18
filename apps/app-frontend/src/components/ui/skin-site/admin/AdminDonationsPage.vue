<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	skinSiteAdminDonations,
	skinSiteCreateDonation,
	skinSiteDeleteDonation,
	type SkinSiteDonationAdminEntry,
	type SkinSiteDonationSummary,
	skinSiteUpdateDonation,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.donations.title', defaultMessage: 'Donations' },
	loading: { id: 'app.skin-site.admin.donations.loading', defaultMessage: 'Loading…' },
	failed: {
		id: 'app.skin-site.admin.donations.failed',
		defaultMessage: 'Could not load donations.',
	},
	empty: { id: 'app.skin-site.admin.donations.empty', defaultMessage: 'No donations yet.' },
	totalAmount: { id: 'app.skin-site.admin.donations.total-amount', defaultMessage: 'Total' },
	donorCount: { id: 'app.skin-site.admin.donations.donor-count', defaultMessage: 'Donors' },
	donor: { id: 'app.skin-site.admin.donations.donor', defaultMessage: 'Donor' },
	amount: { id: 'app.skin-site.admin.donations.amount', defaultMessage: 'Amount' },
	updatedAt: { id: 'app.skin-site.admin.donations.updated-at', defaultMessage: 'Updated' },
	external: { id: 'app.skin-site.admin.donations.external', defaultMessage: 'External' },
	linked: { id: 'app.skin-site.admin.donations.linked', defaultMessage: 'Linked' },
	create: { id: 'app.skin-site.admin.donations.create', defaultMessage: 'Add donation' },
	save: { id: 'app.skin-site.admin.donations.save', defaultMessage: 'Save' },
	cancel: { id: 'app.skin-site.admin.donations.cancel', defaultMessage: 'Cancel' },
	edit: { id: 'app.skin-site.admin.donations.edit', defaultMessage: 'Edit' },
	remove: { id: 'app.skin-site.admin.donations.remove', defaultMessage: 'Delete' },
	amountField: { id: 'app.skin-site.admin.donations.amount-field', defaultMessage: 'Amount' },
	displayName: {
		id: 'app.skin-site.admin.donations.display-name',
		defaultMessage: 'Display name',
	},
	userUuid: { id: 'app.skin-site.admin.donations.user-uuid', defaultMessage: 'User UUID' },
	qq: { id: 'app.skin-site.admin.donations.qq', defaultMessage: 'QQ' },
	appendMode: {
		id: 'app.skin-site.admin.donations.append-mode',
		defaultMessage: 'Append to existing amount',
	},
	created: { id: 'app.skin-site.admin.donations.created', defaultMessage: 'Donation created.' },
	updated: { id: 'app.skin-site.admin.donations.updated', defaultMessage: 'Donation updated.' },
	deleted: { id: 'app.skin-site.admin.donations.deleted', defaultMessage: 'Donation deleted.' },
	confirmDelete: {
		id: 'app.skin-site.admin.donations.confirm-delete',
		defaultMessage: 'Delete the donation from “{name}”? This cannot be undone.',
	},
	loadMore: { id: 'app.skin-site.admin.donations.load-more', defaultMessage: 'Load more' },
})

const items = ref<SkinSiteDonationAdminEntry[]>([])
const summary = ref<SkinSiteDonationSummary | null>(null)
const hasMore = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const failed = ref(false)
const offset = ref(0)

const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const editingVersion = ref(0)
const saving = ref(false)
const deletingId = ref<number | null>(null)

const form = ref({
	amount: '',
	displayName: '',
	userUuid: '',
	qq: '',
	appendMode: false,
})

const canSave = computed(() => form.value.amount.trim().length > 0 && !saving.value)

function formatDateTime(ts: number): string {
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ''
	}
}

function resetForm() {
	form.value = { amount: '', displayName: '', userUuid: '', qq: '', appendMode: false }
	editingId.value = null
	editingVersion.value = 0
}

function openCreate() {
	resetForm()
	editorOpen.value = true
}

function openEdit(entry: SkinSiteDonationAdminEntry) {
	form.value = {
		amount: entry.donor.amount,
		displayName: entry.donor.username,
		userUuid: entry.userUuid ?? '',
		qq: entry.qq ?? '',
		appendMode: false,
	}
	editingId.value = entry.donor.id
	editingVersion.value = entry.version
	editorOpen.value = true
}

function closeEditor() {
	editorOpen.value = false
	resetForm()
}

async function load(reset = true) {
	if (reset) {
		loading.value = true
		items.value = []
		offset.value = 0
	} else {
		loadingMore.value = true
	}
	failed.value = false
	try {
		const result = await skinSiteAdminDonations(offset.value)
		if (!result.success) throw new Error(result.errorMessage)
		const page = result.payload
		items.value = reset ? page.items : [...items.value, ...page.items]
		summary.value = page.summary
		hasMore.value = page.hasMore
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
		loadingMore.value = false
	}
}

async function loadMore() {
	if (!hasMore.value) return
	offset.value += 20
	await load(false)
}

async function save() {
	if (!canSave.value) return
	saving.value = true
	try {
		if (editingId.value === null) {
			const payload: Parameters<typeof skinSiteCreateDonation>[0] = {
				amount: form.value.amount.trim(),
			}
			if (form.value.userUuid.trim()) payload.userUuid = form.value.userUuid.trim()
			if (form.value.qq.trim()) payload.qq = form.value.qq.trim()
			if (form.value.displayName.trim()) payload.displayName = form.value.displayName.trim()
			const result = await skinSiteCreateDonation(payload)
			if (!result.success) throw new Error(result.errorMessage)
			addNotification({ type: 'success', title: formatMessage(messages.created) })
		} else {
			const result = await skinSiteUpdateDonation(editingId.value, {
				amount: form.value.amount.trim(),
				version: editingVersion.value,
				displayName: form.value.displayName.trim() || undefined,
				mode: form.value.appendMode ? 'APPEND' : 'REPLACE',
			})
			if (!result.success) throw new Error(result.errorMessage)
			addNotification({ type: 'success', title: formatMessage(messages.updated) })
		}
		closeEditor()
		await load(true)
	} catch (error) {
		handleError(error)
	} finally {
		saving.value = false
	}
}

async function remove(entry: SkinSiteDonationAdminEntry) {
	if (deletingId.value !== null) return
	if (!window.confirm(formatMessage(messages.confirmDelete, { name: entry.donor.username }))) return
	deletingId.value = entry.donor.id
	try {
		const result = await skinSiteDeleteDonation(entry.donor.id, entry.version)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.deleted) })
		await load(true)
	} catch (error) {
		handleError(error)
	} finally {
		deletingId.value = null
	}
}

onMounted(() => void load(true))
</script>
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<button
				type="button"
				class="ml-auto rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
				@click="openCreate"
			>
				{{ formatMessage(messages.create) }}
			</button>
		</div>

		<div v-if="summary" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div class="flex flex-col gap-1 rounded-xl bg-bg-raised p-4">
				<span class="text-xs text-secondary">{{ formatMessage(messages.totalAmount) }}</span>
				<span class="text-xl font-bold text-contrast">{{ summary.totalAmount }}</span>
			</div>
			<div class="flex flex-col gap-1 rounded-xl bg-bg-raised p-4">
				<span class="text-xs text-secondary">{{ formatMessage(messages.donorCount) }}</span>
				<span class="text-xl font-bold text-contrast">{{ summary.donorCount }}</span>
			</div>
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
				:key="entry.donor.id"
				class="flex flex-wrap items-center gap-3 rounded-xl bg-bg-raised p-3"
			>
				<span class="shrink-0 text-xs text-secondary">#{{ entry.donor.rank }}</span>
				<div class="flex min-w-0 flex-1 flex-col">
					<span class="truncate text-sm font-semibold text-contrast">
						{{ entry.donor.username }}
					</span>
					<span class="truncate text-xs text-secondary">
						{{ formatMessage(messages.updatedAt) }}:
						{{ formatDateTime(entry.updatedAt) }}
					</span>
				</div>
				<span class="shrink-0 text-sm font-bold text-contrast">{{ entry.donor.amount }}</span>
				<span
					v-if="entry.external"
					class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
				>
					{{ formatMessage(messages.external) }}
				</span>
				<span
					v-else
					class="shrink-0 rounded-full bg-green px-2 py-0.5 text-[10px] font-semibold text-contrast"
				>
					{{ formatMessage(messages.linked) }}
				</span>
				<button
					type="button"
					class="shrink-0 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
					@click="openEdit(entry)"
				>
					{{ formatMessage(messages.edit) }}
				</button>
				<button
					type="button"
					class="shrink-0 rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="deletingId !== null"
					@click="remove(entry)"
				>
					{{ formatMessage(messages.remove) }}
				</button>
			</div>

			<button
				v-if="hasMore"
				type="button"
				class="w-fit self-center rounded-full bg-button-bg px-4 py-2 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
				:disabled="loadingMore"
				@click="loadMore"
			>
				{{ formatMessage(messages.loadMore) }}
			</button>
		</div>

		<div
			v-if="editorOpen"
			class="flex flex-col gap-3 rounded-xl border border-solid border-surface-5 bg-bg-raised p-4"
		>
			<label class="flex flex-col gap-1">
				<span class="text-sm font-semibold text-contrast">
					{{ formatMessage(messages.amountField) }}
				</span>
				<input
					v-model="form.amount"
					type="text"
					inputmode="decimal"
					class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-sm font-semibold text-contrast">
					{{ formatMessage(messages.displayName) }}
				</span>
				<input
					v-model="form.displayName"
					type="text"
					class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
				/>
			</label>

			<template v-if="editingId === null">
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold text-contrast">
						{{ formatMessage(messages.userUuid) }}
					</span>
					<input
						v-model="form.userUuid"
						type="text"
						class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold text-contrast">
						{{ formatMessage(messages.qq) }}
					</span>
					<input
						v-model="form.qq"
						type="text"
						class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
					/>
				</label>
			</template>
			<label v-else class="flex items-center gap-2">
				<input v-model="form.appendMode" type="checkbox" />
				<span class="text-sm text-contrast">{{ formatMessage(messages.appendMode) }}</span>
			</label>

			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-full bg-button-bg px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
					@click="closeEditor"
				>
					{{ formatMessage(messages.cancel) }}
				</button>
				<button
					type="button"
					class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast disabled:opacity-50"
					:disabled="!canSave"
					@click="save"
				>
					{{ formatMessage(messages.save) }}
				</button>
			</div>
		</div>
	</div>
</template>
