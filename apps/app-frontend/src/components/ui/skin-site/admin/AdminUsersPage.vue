<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	skinSiteAdminDeleteUser,
	type SkinSiteAdminPlayer,
	skinSiteAdminUpdateUser,
	type SkinSiteAdminUser,
	skinSiteAdminUserCount,
	skinSiteAdminUserList,
	skinSiteAdminUserPlayers,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.users.title', defaultMessage: 'Users' },
	loading: { id: 'app.skin-site.admin.users.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.admin.users.failed', defaultMessage: 'Could not load users.' },
	empty: { id: 'app.skin-site.admin.users.empty', defaultMessage: 'No users found.' },
	search: { id: 'app.skin-site.admin.users.search', defaultMessage: 'Search' },
	searchName: { id: 'app.skin-site.admin.users.search-name', defaultMessage: 'Username' },
	searchEmail: { id: 'app.skin-site.admin.users.search-email', defaultMessage: 'Email' },
	searchUuid: { id: 'app.skin-site.admin.users.search-uuid', defaultMessage: 'UUID' },
	total: { id: 'app.skin-site.admin.users.total', defaultMessage: '{count} users' },
	prev: { id: 'app.skin-site.admin.users.prev', defaultMessage: 'Previous' },
	next: { id: 'app.skin-site.admin.users.next', defaultMessage: 'Next' },
	page: { id: 'app.skin-site.admin.users.page', defaultMessage: 'Page {page}' },
	edit: { id: 'app.skin-site.admin.users.edit', defaultMessage: 'Edit' },
	save: { id: 'app.skin-site.admin.users.save', defaultMessage: 'Save' },
	cancel: { id: 'app.skin-site.admin.users.cancel', defaultMessage: 'Cancel' },
	remove: { id: 'app.skin-site.admin.users.remove', defaultMessage: 'Delete' },
	players: { id: 'app.skin-site.admin.users.players', defaultMessage: 'Players' },
	updated: { id: 'app.skin-site.admin.users.updated', defaultMessage: 'User updated.' },
	deleted: { id: 'app.skin-site.admin.users.deleted', defaultMessage: 'User deleted.' },
	confirmDelete: {
		id: 'app.skin-site.admin.users.confirm-delete',
		defaultMessage: 'Delete user “{name}”? This cannot be undone.',
	},
	username: { id: 'app.skin-site.admin.users.username', defaultMessage: 'Username' },
	email: { id: 'app.skin-site.admin.users.email', defaultMessage: 'Email' },
	qq: { id: 'app.skin-site.admin.users.qq', defaultMessage: 'QQ' },
	password: { id: 'app.skin-site.admin.users.password', defaultMessage: 'New password' },
	passwordHint: {
		id: 'app.skin-site.admin.users.password-hint',
		defaultMessage: 'Leave empty to keep the current password.',
	},
	banned: { id: 'app.skin-site.admin.users.banned', defaultMessage: 'Banned' },
	permissions: { id: 'app.skin-site.admin.users.permissions', defaultMessage: 'Permissions' },
	permissionsHint: {
		id: 'app.skin-site.admin.users.permissions-hint',
		defaultMessage: 'Comma separated, e.g. WEB_ADMIN, SERVER_ADMIN.',
	},
	noPlayers: { id: 'app.skin-site.admin.users.no-players', defaultMessage: 'No linked players.' },
	registered: { id: 'app.skin-site.admin.users.registered', defaultMessage: 'Registered' },
})

const PAGE_SIZE = 20

const items = ref<SkinSiteAdminUser[]>([])
const total = ref(0)
const offset = ref(0)
const loading = ref(true)
const failed = ref(false)

const keyword = ref('')
const searchField = ref<'username' | 'email' | 'uuid'>('username')

const editingUuid = ref<string | null>(null)
const editForm = ref({
	username: '',
	email: '',
	qq: '',
	password: '',
	banned: false,
	permissions: '',
})
const saving = ref(false)
const deletingUuid = ref<string | null>(null)

const playersFor = ref<SkinSiteAdminPlayer[] | null>(null)
const playersLoading = ref(false)
const playersUuid = ref<string | null>(null)

const page = computed(() => Math.floor(offset.value / PAGE_SIZE) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const hasPrev = computed(() => offset.value > 0)
const hasNext = computed(() => offset.value + PAGE_SIZE < total.value)

const SEARCH_FIELDS: Array<'username' | 'email' | 'uuid'> = ['username', 'email', 'uuid']

function searchFieldLabel(field: string): string {
	if (field === 'email') return formatMessage(messages.searchEmail)
	if (field === 'uuid') return formatMessage(messages.searchUuid)
	return formatMessage(messages.searchName)
}

function formatDate(ts: number): string {
	try {
		return new Date(ts).toLocaleDateString()
	} catch {
		return ''
	}
}

async function load(reset = false) {
	if (reset) offset.value = 0
	loading.value = true
	failed.value = false
	try {
		const kw = keyword.value.trim()
		const listResult = await skinSiteAdminUserList({
			limit: PAGE_SIZE,
			offset: offset.value,
			searchField: kw ? searchField.value : undefined,
			keyword: kw || undefined,
		})
		if (!listResult.success) throw new Error(listResult.errorMessage)
		items.value = listResult.payload ?? []
		const countResult = await skinSiteAdminUserCount(
			kw ? { searchField: searchField.value, keyword: kw } : undefined,
		)
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

function startEdit(user: SkinSiteAdminUser) {
	editingUuid.value = user.uuid
	editForm.value = {
		username: user.username,
		email: user.email,
		qq: user.qq === undefined || user.qq === null ? '' : String(user.qq),
		password: '',
		banned: user.banned,
		permissions: user.permissions.join(', '),
	}
}

function cancelEdit() {
	editingUuid.value = null
	editForm.value = {
		username: '',
		email: '',
		qq: '',
		password: '',
		banned: false,
		permissions: '',
	}
}

async function saveEdit() {
	if (!editingUuid.value || saving.value) return
	saving.value = true
	try {
		const qqText = editForm.value.qq.trim()
		const permissions = editForm.value.permissions
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean)
		const result = await skinSiteAdminUpdateUser({
			uuid: editingUuid.value,
			username: editForm.value.username.trim(),
			email: editForm.value.email.trim(),
			qq: qqText ? Number(qqText) : undefined,
			password: editForm.value.password ? editForm.value.password : undefined,
			banned: editForm.value.banned,
			permissions,
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

async function remove(user: SkinSiteAdminUser) {
	if (deletingUuid.value !== null) return
	if (!window.confirm(formatMessage(messages.confirmDelete, { name: user.username }))) return
	deletingUuid.value = user.uuid
	try {
		const result = await skinSiteAdminDeleteUser(user.uuid)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.deleted) })
		await load()
	} catch (error) {
		handleError(error)
	} finally {
		deletingUuid.value = null
	}
}

async function togglePlayers(user: SkinSiteAdminUser) {
	if (playersUuid.value === user.uuid) {
		playersUuid.value = null
		playersFor.value = null
		return
	}
	playersUuid.value = user.uuid
	playersLoading.value = true
	playersFor.value = null
	try {
		const result = await skinSiteAdminUserPlayers(user.uuid)
		if (result.success) {
			playersFor.value = result.payload ?? []
		} else {
			playersFor.value = []
		}
	} catch (error) {
		playersFor.value = []
		handleError(error)
	} finally {
		playersLoading.value = false
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
				v-for="user in items"
				:key="user.uuid"
				class="flex flex-col gap-2 rounded-xl bg-bg-raised p-3"
			>
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex min-w-0 flex-1 flex-col">
						<span class="truncate text-sm font-semibold text-contrast">
							{{ user.username }}
							<span class="text-xs font-normal text-secondary">#{{ user.id }}</span>
						</span>
						<span class="truncate text-xs text-secondary">{{ user.email }}</span>
						<span class="truncate font-mono text-[10px] text-secondary">{{ user.uuid }}</span>
					</div>
					<span
						v-if="user.banned"
						class="shrink-0 rounded-full bg-red px-2 py-0.5 text-[10px] font-semibold text-contrast"
					>
						{{ formatMessage(messages.banned) }}
					</span>
					<span
						v-for="perm in user.permissions"
						:key="perm"
						class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
					>
						{{ perm }}
					</span>
					<span class="shrink-0 text-xs text-secondary">
						{{ formatDate(user.registerTime) }}
					</span>
				</div>

				<template v-if="editingUuid === user.uuid">
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-contrast">
								{{ formatMessage(messages.username) }}
							</span>
							<input
								v-model="editForm.username"
								type="text"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-sm text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-contrast">
								{{ formatMessage(messages.email) }}
							</span>
							<input
								v-model="editForm.email"
								type="email"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-sm text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-contrast">
								{{ formatMessage(messages.qq) }}
							</span>
							<input
								v-model="editForm.qq"
								type="text"
								inputmode="numeric"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-sm text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-contrast">
								{{ formatMessage(messages.password) }}
							</span>
							<input
								v-model="editForm.password"
								type="password"
								:placeholder="formatMessage(messages.passwordHint)"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-sm text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1 sm:col-span-2">
							<span class="text-xs font-semibold text-contrast">
								{{ formatMessage(messages.permissions) }}
							</span>
							<input
								v-model="editForm.permissions"
								type="text"
								:placeholder="formatMessage(messages.permissionsHint)"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-sm text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex items-center gap-2">
							<input v-model="editForm.banned" type="checkbox" />
							<span class="text-sm text-contrast">{{ formatMessage(messages.banned) }}</span>
						</label>
					</div>
					<div class="flex justify-end gap-2">
						<button
							type="button"
							class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
							@click="cancelEdit"
						>
							{{ formatMessage(messages.cancel) }}
						</button>
						<button
							type="button"
							class="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
							:disabled="saving"
							@click="saveEdit"
						>
							{{ formatMessage(messages.save) }}
						</button>
					</div>
				</template>

				<template v-else>
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
							@click="startEdit(user)"
						>
							{{ formatMessage(messages.edit) }}
						</button>
						<button
							type="button"
							class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
							@click="togglePlayers(user)"
						>
							{{ formatMessage(messages.players) }}
						</button>
						<button
							type="button"
							class="rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
							:disabled="deletingUuid !== null"
							@click="remove(user)"
						>
							{{ formatMessage(messages.remove) }}
						</button>
					</div>

					<div v-if="playersUuid === user.uuid" class="flex flex-wrap gap-2 pt-1">
						<div v-if="playersLoading" class="flex items-center gap-2 text-xs text-secondary">
							<SpinnerIcon class="size-3 animate-spin" />
							{{ formatMessage(messages.loading) }}
						</div>
						<span v-else-if="!playersFor || !playersFor.length" class="text-xs text-secondary">
							{{ formatMessage(messages.noPlayers) }}
						</span>
						<span
							v-for="p in playersFor ?? []"
							:key="p.uuid"
							class="rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-contrast"
						>
							{{ p.name }}
						</span>
					</div>
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
