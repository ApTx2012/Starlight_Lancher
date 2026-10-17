<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	skinSiteAdminDeletePlayer,
	type SkinSiteAdminPlayer,
	skinSiteAdminPlayerCount,
	skinSiteAdminPlayerList,
	skinSiteAdminUpdatePlayer,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.players.title', defaultMessage: 'Players' },
	loading: { id: 'app.skin-site.admin.players.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.admin.players.failed', defaultMessage: 'Could not load players.' },
	empty: { id: 'app.skin-site.admin.players.empty', defaultMessage: 'No players found.' },
	search: { id: 'app.skin-site.admin.players.search', defaultMessage: 'Search' },
	searchName: { id: 'app.skin-site.admin.players.search-name', defaultMessage: 'Name' },
	searchOwner: { id: 'app.skin-site.admin.players.search-owner', defaultMessage: 'Owner' },
	searchUuid: { id: 'app.skin-site.admin.players.search-uuid', defaultMessage: 'UUID' },
	total: { id: 'app.skin-site.admin.players.total', defaultMessage: '{count} players' },
	prev: { id: 'app.skin-site.admin.players.prev', defaultMessage: 'Previous' },
	next: { id: 'app.skin-site.admin.players.next', defaultMessage: 'Next' },
	page: { id: 'app.skin-site.admin.players.page', defaultMessage: 'Page {page}' },
	name: { id: 'app.skin-site.admin.players.name', defaultMessage: 'Name' },
	owner: { id: 'app.skin-site.admin.players.owner', defaultMessage: 'Owner' },
	source: { id: 'app.skin-site.admin.players.source', defaultMessage: 'Source' },
	legacy: { id: 'app.skin-site.admin.players.legacy', defaultMessage: 'Legacy adapted' },
	actions: { id: 'app.skin-site.admin.players.actions', defaultMessage: 'Actions' },
	edit: { id: 'app.skin-site.admin.players.edit', defaultMessage: 'Edit' },
	save: { id: 'app.skin-site.admin.players.save', defaultMessage: 'Save' },
	cancel: { id: 'app.skin-site.admin.players.cancel', defaultMessage: 'Cancel' },
	remove: { id: 'app.skin-site.admin.players.remove', defaultMessage: 'Delete' },
	updated: { id: 'app.skin-site.admin.players.updated', defaultMessage: 'Player updated.' },
	deleted: { id: 'app.skin-site.admin.players.deleted', defaultMessage: 'Player deleted.' },
	confirmDelete: {
		id: 'app.skin-site.admin.players.confirm-delete',
		defaultMessage: 'Delete player “{name}”? This cannot be undone.',
	},
	mojang: { id: 'app.skin-site.admin.players.mojang', defaultMessage: 'Mojang' },
	custom: { id: 'app.skin-site.admin.players.custom', defaultMessage: 'Skin site' },
})

const PAGE_SIZE = 20

const items = ref<SkinSiteAdminPlayer[]>([])
const total = ref(0)
const offset = ref(0)
const loading = ref(true)
const failed = ref(false)

const keyword = ref('')
const searchField = ref<'name' | 'ownerUsername' | 'uuid'>('name')

const editingUuid = ref<string | null>(null)
const editName = ref('')
const editIsMojang = ref(false)
const saving = ref(false)
const deletingUuid = ref<string | null>(null)

const page = computed(() => Math.floor(offset.value / PAGE_SIZE) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const hasPrev = computed(() => offset.value > 0)
const hasNext = computed(() => offset.value + PAGE_SIZE < total.value)

const SEARCH_FIELDS: Array<'name' | 'ownerUsername' | 'uuid'> = ['name', 'ownerUsername', 'uuid']

function searchFieldLabel(field: string): string {
	if (field === 'ownerUsername') return formatMessage(messages.searchOwner)
	if (field === 'uuid') return formatMessage(messages.searchUuid)
	return formatMessage(messages.searchName)
}

function buildQuery() {
	const kw = keyword.value.trim()
	return {
		limit: PAGE_SIZE,
		offset: offset.value,
		searchField: kw ? searchField.value : undefined,
		keyword: kw || undefined,
	}
}

async function load(reset = false) {
	if (reset) offset.value = 0
	loading.value = true
	failed.value = false
	try {
		const query = buildQuery()
		const [listResult, countResult] = await Promise.all([
			skinSiteAdminPlayerList(query),
			skinSiteAdminPlayerCount(
				query.keyword ? { searchField: query.searchField, keyword: query.keyword } : undefined,
			),
		])
		if (!listResult.success) throw new Error(listResult.errorMessage)
		items.value = listResult.payload ?? []
		if (countResult.success && typeof countResult.payload === 'number') {
			total.value = countResult.payload
		}
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
	}
}

async function prevPage() {
	if (!hasPrev.value) return
	offset.value = Math.max(0, offset.value - PAGE_SIZE)
	await load()
}

async function nextPage() {
	if (!hasNext.value) return
	offset.value += PAGE_SIZE
	await load()
}

function startEdit(player: SkinSiteAdminPlayer) {
	editingUuid.value = player.uuid
	editName.value = player.name
	editIsMojang.value = player.isMojang
}

function cancelEdit() {
	editingUuid.value = null
	editName.value = ''
	editIsMojang.value = false
}

async function saveEdit() {
	if (!editingUuid.value || saving.value) return
	saving.value = true
	try {
		const result = await skinSiteAdminUpdatePlayer({
			uuid: editingUuid.value,
			name: editName.value.trim(),
			isMojang: editIsMojang.value,
		})
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.updated) })
		cancelEdit()
		await load()
	} catch (error) {
		handleError(error)
	} finally {
		saving.value = false
	}
}

async function remove(player: SkinSiteAdminPlayer) {
	if (deletingUuid.value !== null) return
	if (!window.confirm(formatMessage(messages.confirmDelete, { name: player.name }))) return
	deletingUuid.value = player.uuid
	try {
		const result = await skinSiteAdminDeletePlayer(player.uuid)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.deleted) })
		await load()
	} catch (error) {
		handleError(error)
	} finally {
		deletingUuid.value = null
	}
}

onMounted(() => void load())
</script>
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<span class="text-xs text-secondary">
				{{ formatMessage(messages.total, { count: total }) }}
			</span>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<select
				v-model="searchField"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
			>
				<option v-for="f in SEARCH_FIELDS" :key="f" :value="f">
					{{ searchFieldLabel(f) }}
				</option>
			</select>
			<input
				v-model="keyword"
				type="text"
				:placeholder="formatMessage(messages.search)"
				class="min-w-0 flex-1 rounded-full border border-solid border-surface-5 bg-bg px-3 py-1 text-xs text-contrast outline-none focus:border-brand"
				@keyup.enter="load(true)"
			/>
			<button
				type="button"
				class="rounded-full bg-brand px-4 py-1 text-xs font-semibold text-contrast hover:brightness-110"
				@click="load(true)"
			>
				{{ formatMessage(messages.search) }}
			</button>
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
				v-for="player in items"
				:key="player.uuid"
				class="flex flex-wrap items-center gap-3 rounded-xl bg-bg-raised p-3"
			>
				<div class="flex min-w-0 flex-1 flex-col">
					<input
						v-if="editingUuid === player.uuid"
						v-model="editName"
						type="text"
						class="w-full rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-sm text-contrast outline-none focus:border-brand"
					/>
					<span v-else class="truncate text-sm font-semibold text-contrast">
						{{ player.name }}
					</span>
					<span class="truncate font-mono text-[10px] text-secondary">{{ player.uuid }}</span>
				</div>

				<span class="shrink-0 text-xs text-secondary">{{ player.ownerUsername }}</span>
				<span
					class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
				>
					{{ player.isMojang ? formatMessage(messages.mojang) : formatMessage(messages.custom) }}
				</span>
				<span
					v-if="player.legacyInternalAdapted"
					class="shrink-0 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-semibold text-contrast"
				>
					{{ formatMessage(messages.legacy) }}
				</span>

				<template v-if="editingUuid === player.uuid">
					<label class="flex shrink-0 items-center gap-1 text-xs text-contrast">
						<input v-model="editIsMojang" type="checkbox" />
						{{ formatMessage(messages.mojang) }}
					</label>
					<button
						type="button"
						class="shrink-0 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="cancelEdit"
					>
						{{ formatMessage(messages.cancel) }}
					</button>
					<button
						type="button"
						class="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="saving"
						@click="saveEdit"
					>
						{{ formatMessage(messages.save) }}
					</button>
				</template>
				<template v-else>
					<button
						type="button"
						class="shrink-0 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="startEdit(player)"
					>
						{{ formatMessage(messages.edit) }}
					</button>
					<button
						type="button"
						class="shrink-0 rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="deletingUuid !== null"
						@click="remove(player)"
					>
						{{ formatMessage(messages.remove) }}
					</button>
				</template>
			</div>

			<div class="flex items-center justify-center gap-3 pt-2">
				<button
					type="button"
					class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="!hasPrev"
					@click="prevPage"
				>
					{{ formatMessage(messages.prev) }}
				</button>
				<span class="text-xs text-secondary">
					{{ formatMessage(messages.page, { page }) }} / {{ pageCount }}
				</span>
				<button
					type="button"
					class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="!hasNext"
					@click="nextPage"
				>
					{{ formatMessage(messages.next) }}
				</button>
			</div>
		</div>
	</div>
</template>
