<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	skinSiteAddDownloadCategory,
	skinSiteAddDownloadItem,
	skinSiteBindDownloadCategory,
	skinSiteDeleteDownloadCategory,
	skinSiteDeleteDownloadItem,
	skinSiteDownloadCategories,
	type SkinSiteDownloadCategory,
	type SkinSiteDownloadItem,
	skinSiteDownloadItemCount,
	skinSiteDownloadItems,
	type SkinSiteDownloadRoute,
	type SkinSiteDownloadStatus,
	skinSiteUnbindDownloadCategory,
	skinSiteUpdateDownloadItem,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.downloads.title', defaultMessage: 'Downloads' },
	loading: { id: 'app.skin-site.admin.downloads.loading', defaultMessage: 'Loading…' },
	failed: {
		id: 'app.skin-site.admin.downloads.failed',
		defaultMessage: 'Could not load downloads.',
	},
	empty: { id: 'app.skin-site.admin.downloads.empty', defaultMessage: 'No download items.' },
	categories: { id: 'app.skin-site.admin.downloads.categories', defaultMessage: 'Categories' },
	all: { id: 'app.skin-site.admin.downloads.all', defaultMessage: 'All items' },
	addCategory: { id: 'app.skin-site.admin.downloads.add-category', defaultMessage: 'Add' },
	categoryName: {
		id: 'app.skin-site.admin.downloads.category-name',
		defaultMessage: 'Category name',
	},
	removeCategory: {
		id: 'app.skin-site.admin.downloads.remove-category',
		defaultMessage: 'Remove',
	},
	total: { id: 'app.skin-site.admin.downloads.total', defaultMessage: '{count} items' },
	addItem: { id: 'app.skin-site.admin.downloads.add-item', defaultMessage: 'New item' },
	save: { id: 'app.skin-site.admin.downloads.save', defaultMessage: 'Save' },
	cancel: { id: 'app.skin-site.admin.downloads.cancel', defaultMessage: 'Cancel' },
	edit: { id: 'app.skin-site.admin.downloads.edit', defaultMessage: 'Edit' },
	remove: { id: 'app.skin-site.admin.downloads.remove', defaultMessage: 'Delete' },
	filename: { id: 'app.skin-site.admin.downloads.filename', defaultMessage: 'File name' },
	description: {
		id: 'app.skin-site.admin.downloads.description',
		defaultMessage: 'Description',
	},
	routes: { id: 'app.skin-site.admin.downloads.routes', defaultMessage: 'Download routes' },
	routeName: { id: 'app.skin-site.admin.downloads.route-name', defaultMessage: 'Name' },
	routeUrl: { id: 'app.skin-site.admin.downloads.route-url', defaultMessage: 'URL' },
	addRoute: { id: 'app.skin-site.admin.downloads.add-route', defaultMessage: 'Add route' },
	removeRoute: { id: 'app.skin-site.admin.downloads.remove-route', defaultMessage: 'Remove' },
	statuses: { id: 'app.skin-site.admin.downloads.statuses', defaultMessage: 'Statuses' },
	bindCategory: {
		id: 'app.skin-site.admin.downloads.bind-category',
		defaultMessage: 'Categories',
	},
	uploader: { id: 'app.skin-site.admin.downloads.uploader', defaultMessage: 'by {name}' },
	created: { id: 'app.skin-site.admin.downloads.created', defaultMessage: 'Item created.' },
	updated: { id: 'app.skin-site.admin.downloads.updated', defaultMessage: 'Item updated.' },
	deleted: { id: 'app.skin-site.admin.downloads.deleted', defaultMessage: 'Item deleted.' },
	categoryAdded: {
		id: 'app.skin-site.admin.downloads.category-added',
		defaultMessage: 'Category added.',
	},
	categoryDeleted: {
		id: 'app.skin-site.admin.downloads.category-deleted',
		defaultMessage: 'Category deleted.',
	},
	confirmDeleteItem: {
		id: 'app.skin-site.admin.downloads.confirm-delete-item',
		defaultMessage: 'Delete “{name}”? This cannot be undone.',
	},
	confirmDeleteCategory: {
		id: 'app.skin-site.admin.downloads.confirm-delete-category',
		defaultMessage: 'Delete category “{name}”?',
	},
})

const STATUS_OPTIONS: SkinSiteDownloadStatus[] = ['OK', 'NEW', 'LEGACY', 'OUTDATED', 'REMOVAL']

const items = ref<SkinSiteDownloadItem[]>([])
const categories = ref<SkinSiteDownloadCategory[]>([])
const total = ref(0)
const loading = ref(true)
const failed = ref(false)
const activeCategory = ref<string>('')

const newCategoryName = ref('')
const categoryWorking = ref(false)

const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const deletingId = ref<number | null>(null)

const form = ref({
	filename: '',
	description: '',
	status: [] as SkinSiteDownloadStatus[],
	routes: [{ name: '', url: '' }] as Array<{ name: string; url: string }>,
	selectedCategories: [] as number[],
})

const canSave = computed(
	() =>
		form.value.filename.trim().length > 0 &&
		form.value.routes.some((r) => r.url.trim().length > 0) &&
		!saving.value,
)

function resetForm() {
	form.value = {
		filename: '',
		description: '',
		status: [],
		routes: [{ name: '', url: '' }],
		selectedCategories: [],
	}
	editingId.value = null
}

function openCreate() {
	resetForm()
	editorOpen.value = true
}

function openEdit(item: SkinSiteDownloadItem) {
	form.value = {
		filename: item.filename,
		description: item.description,
		status: [...item.status],
		routes: item.routes.length
			? item.routes.map((r) => ({ name: r.name ?? '', url: r.url }))
			: [{ name: '', url: '' }],
		selectedCategories: categories.value
			.filter((c) => item.category.includes(c.name))
			.map((c) => c.id),
	}
	editingId.value = item.id
	editorOpen.value = true
}

function closeEditor() {
	editorOpen.value = false
	resetForm()
}

function addRouteRow() {
	form.value.routes.push({ name: '', url: '' })
}

function removeRouteRow(index: number) {
	if (form.value.routes.length <= 1) return
	form.value.routes.splice(index, 1)
}

function toggleStatus(status: SkinSiteDownloadStatus) {
	const i = form.value.status.indexOf(status)
	if (i >= 0) form.value.status.splice(i, 1)
	else form.value.status.push(status)
}

async function loadCategories() {
	try {
		const result = await skinSiteDownloadCategories()
		if (result.success) categories.value = result.payload ?? []
	} catch (error) {
		handleError(error)
	}
}

async function loadItems() {
	loading.value = true
	failed.value = false
	try {
		const listResult = await skinSiteDownloadItems({
			limit: 200,
			offset: 0,
			category: activeCategory.value || undefined,
		})
		if (!listResult.success) throw new Error(listResult.errorMessage)
		items.value = listResult.payload ?? []
		const countResult = await skinSiteDownloadItemCount(activeCategory.value || undefined)
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

async function selectCategory(name: string) {
	activeCategory.value = name
	await loadItems()
}

async function addCategory() {
	const name = newCategoryName.value.trim()
	if (!name || categoryWorking.value) return
	categoryWorking.value = true
	try {
		const result = await skinSiteAddDownloadCategory(name)
		if (!result.success) throw new Error(result.errorMessage)
		newCategoryName.value = ''
		addNotification({ type: 'success', title: formatMessage(messages.categoryAdded) })
		await loadCategories()
	} catch (error) {
		handleError(error)
	} finally {
		categoryWorking.value = false
	}
}

async function removeCategory(category: SkinSiteDownloadCategory) {
	if (categoryWorking.value) return
	if (!window.confirm(formatMessage(messages.confirmDeleteCategory, { name: category.name })))
		return
	categoryWorking.value = true
	try {
		const result = await skinSiteDeleteDownloadCategory(category.id)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.categoryDeleted) })
		if (activeCategory.value === category.name) activeCategory.value = ''
		await loadCategories()
		await loadItems()
	} catch (error) {
		handleError(error)
	} finally {
		categoryWorking.value = false
	}
}

async function save() {
	if (!canSave.value) return
	saving.value = true
	try {
		const routes: SkinSiteDownloadRoute[] = form.value.routes
			.filter((r) => r.url.trim())
			.map((r) => ({ name: r.name.trim() || null, url: r.url.trim() }))
		const payload = {
			routes,
			filename: form.value.filename.trim(),
			description: form.value.description,
			status: form.value.status,
		}
		const result =
			editingId.value === null
				? await skinSiteAddDownloadItem(payload)
				: await skinSiteUpdateDownloadItem(editingId.value, payload)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({
			type: 'success',
			title: formatMessage(editingId.value === null ? messages.created : messages.updated),
		})
		closeEditor()
		await loadItems()
	} catch (error) {
		handleError(error)
	} finally {
		saving.value = false
	}
}

async function remove(item: SkinSiteDownloadItem) {
	if (deletingId.value !== null) return
	if (!window.confirm(formatMessage(messages.confirmDeleteItem, { name: item.filename }))) return
	deletingId.value = item.id
	try {
		const result = await skinSiteDeleteDownloadItem(item.id)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.deleted) })
		await loadItems()
	} catch (error) {
		handleError(error)
	} finally {
		deletingId.value = null
	}
}

async function toggleItemCategory(item: SkinSiteDownloadItem, category: SkinSiteDownloadCategory) {
	try {
		const bound = item.category.includes(category.name)
		const result = bound
			? await skinSiteUnbindDownloadCategory(item.id, category.id)
			: await skinSiteBindDownloadCategory(item.id, category.id)
		if (!result.success) throw new Error(result.errorMessage)
		await loadItems()
	} catch (error) {
		handleError(error)
	}
}

onMounted(async () => {
	await loadCategories()
	await loadItems()
})
</script>
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<span class="text-xs text-secondary">
				{{ formatMessage(messages.total, { count: total }) }}
			</span>
			<button
				type="button"
				class="ml-auto rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
				@click="openCreate"
			>
				{{ formatMessage(messages.addItem) }}
			</button>
		</div>

		<div class="flex min-h-0 gap-4">
			<aside class="flex w-56 shrink-0 flex-col gap-2">
				<span class="text-xs font-bold tracking-wide text-secondary uppercase">
					{{ formatMessage(messages.categories) }}
				</span>
				<button
					type="button"
					class="rounded-lg px-2 py-1.5 text-left text-xs font-semibold"
					:class="
						activeCategory === ''
							? 'bg-brand text-contrast'
							: 'text-secondary hover:bg-button-bg hover:text-contrast'
					"
					@click="selectCategory('')"
				>
					{{ formatMessage(messages.all) }}
				</button>
				<div v-for="category in categories" :key="category.id" class="flex items-center gap-1">
					<button
						type="button"
						class="min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs font-semibold"
						:class="
							activeCategory === category.name
								? 'bg-brand text-contrast'
								: 'text-secondary hover:bg-button-bg hover:text-contrast'
						"
						@click="selectCategory(category.name)"
					>
						{{ category.name }}
					</button>
					<button
						type="button"
						class="shrink-0 rounded px-1 text-[10px] text-secondary hover:text-red"
						:disabled="categoryWorking"
						@click="removeCategory(category)"
					>
						×
					</button>
				</div>
				<div class="flex items-center gap-1 pt-1">
					<input
						v-model="newCategoryName"
						type="text"
						:placeholder="formatMessage(messages.categoryName)"
						class="min-w-0 flex-1 rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
						@keyup.enter="addCategory"
					/>
					<button
						type="button"
						class="shrink-0 rounded-full bg-button-bg px-2 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="categoryWorking || !newCategoryName.trim()"
						@click="addCategory"
					>
						{{ formatMessage(messages.addCategory) }}
					</button>
				</div>
			</aside>

			<div class="flex min-w-0 flex-1 flex-col gap-2">
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
						v-for="item in items"
						:key="item.id"
						class="flex flex-col gap-2 rounded-xl bg-bg-raised p-3"
					>
						<div class="flex flex-wrap items-center gap-2">
							<span class="shrink-0 text-xs text-secondary">#{{ item.id }}</span>
							<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
								{{ item.filename }}
							</span>
							<span
								v-for="s in item.status"
								:key="s"
								class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
							>
								{{ s }}
							</span>
							<span class="shrink-0 text-xs text-secondary">
								{{ formatMessage(messages.uploader, { name: item.uploader }) }}
							</span>
						</div>
						<div v-if="item.description" class="text-xs text-secondary">
							{{ item.description }}
						</div>
						<div class="flex flex-wrap gap-1">
							<span
								v-for="route in item.routes"
								:key="route.url"
								class="rounded bg-bg px-2 py-0.5 font-mono text-[10px] text-secondary"
							>
								{{ route.name ? route.name + ': ' : '' }}{{ route.url }}
							</span>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-xs text-secondary">
								{{ formatMessage(messages.bindCategory) }}:
							</span>
							<button
								v-for="category in categories"
								:key="category.id"
								type="button"
								class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
								:class="
									item.category.includes(category.name)
										? 'bg-brand text-contrast'
										: 'bg-button-bg text-secondary hover:text-contrast'
								"
								@click="toggleItemCategory(item, category)"
							>
								{{ category.name }}
							</button>
						</div>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
								@click="openEdit(item)"
							>
								{{ formatMessage(messages.edit) }}
							</button>
							<button
								type="button"
								class="rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
								:disabled="deletingId !== null"
								@click="remove(item)"
							>
								{{ formatMessage(messages.remove) }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="editorOpen"
			class="flex flex-col gap-3 rounded-xl border border-solid border-surface-5 bg-bg-raised p-4"
		>
			<label class="flex flex-col gap-1">
				<span class="text-sm font-semibold text-contrast">
					{{ formatMessage(messages.filename) }}
				</span>
				<input
					v-model="form.filename"
					type="text"
					class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-sm font-semibold text-contrast">
					{{ formatMessage(messages.description) }}
				</span>
				<textarea
					v-model="form.description"
					rows="3"
					class="w-full resize-y rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
				/>
			</label>

			<div class="flex flex-col gap-1">
				<span class="text-sm font-semibold text-contrast">
					{{ formatMessage(messages.statuses) }}
				</span>
				<div class="flex flex-wrap gap-2">
					<button
						v-for="status in STATUS_OPTIONS"
						:key="status"
						type="button"
						class="rounded-full px-3 py-1 text-xs font-semibold"
						:class="
							form.status.includes(status)
								? 'bg-brand text-contrast'
								: 'bg-button-bg text-secondary'
						"
						@click="toggleStatus(status)"
					>
						{{ status }}
					</button>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-semibold text-contrast">
					{{ formatMessage(messages.routes) }}
				</span>
				<div
					v-for="(route, idx) in form.routes"
					:key="idx"
					class="flex flex-wrap items-center gap-2"
				>
					<input
						v-model="route.name"
						type="text"
						:placeholder="formatMessage(messages.routeName)"
						class="w-32 rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
					/>
					<input
						v-model="route.url"
						type="text"
						:placeholder="formatMessage(messages.routeUrl)"
						class="min-w-0 flex-1 rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
					/>
					<button
						type="button"
						class="shrink-0 rounded-full bg-button-bg px-2 py-1 text-[10px] font-semibold text-secondary hover:text-red disabled:opacity-50"
						:disabled="form.routes.length <= 1"
						@click="removeRouteRow(idx)"
					>
						{{ formatMessage(messages.removeRoute) }}
					</button>
				</div>
				<button
					type="button"
					class="w-fit rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-secondary hover:brightness-110"
					@click="addRouteRow"
				>
					{{ formatMessage(messages.addRoute) }}
				</button>
			</div>

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
