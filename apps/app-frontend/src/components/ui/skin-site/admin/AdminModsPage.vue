<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	skinSiteActivateModRuntime,
	skinSiteCreateModRuleTag,
	skinSiteDeleteModFile,
	skinSiteDeleteModRuleTag,
	skinSiteDeleteModRuntime,
	skinSiteModCount,
	type SkinSiteModInfo,
	skinSiteModList,
	type SkinSiteModRuleTag,
	skinSiteModRuleTags,
	type SkinSiteModRuntimeAdminState,
	type SkinSiteModRuntimeRelease,
	skinSiteModRuntimeReleases,
	skinSiteModSearch,
	skinSiteUpdateModInfo,
	skinSiteUpdateModRuleTag,
	skinSiteUploadModRuntime,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.mods.title', defaultMessage: 'Mods' },
	tabMods: { id: 'app.skin-site.admin.mods.tab-mods', defaultMessage: 'Mod files' },
	tabTags: { id: 'app.skin-site.admin.mods.tab-tags', defaultMessage: 'Rule tags' },
	tabRuntime: { id: 'app.skin-site.admin.mods.tab-runtime', defaultMessage: 'Runtime' },
	loading: { id: 'app.skin-site.admin.mods.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.admin.mods.failed', defaultMessage: 'Could not load mods.' },
	empty: { id: 'app.skin-site.admin.mods.empty', defaultMessage: 'No mods found.' },
	total: { id: 'app.skin-site.admin.mods.total', defaultMessage: '{count} mods' },
	search: { id: 'app.skin-site.admin.mods.search', defaultMessage: 'Search by name' },
	filterAll: { id: 'app.skin-site.admin.mods.filter-all', defaultMessage: 'All tags' },
	prev: { id: 'app.skin-site.admin.mods.prev', defaultMessage: 'Previous' },
	next: { id: 'app.skin-site.admin.mods.next', defaultMessage: 'Next' },
	page: { id: 'app.skin-site.admin.mods.page', defaultMessage: 'Page {page}' },
	name: { id: 'app.skin-site.admin.mods.name', defaultMessage: 'Name' },
	version: { id: 'app.skin-site.admin.mods.version', defaultMessage: 'Version' },
	modId: { id: 'app.skin-site.admin.mods.mod-id', defaultMessage: 'Mod ID' },
	size: { id: 'app.skin-site.admin.mods.size', defaultMessage: 'Size' },
	loaders: { id: 'app.skin-site.admin.mods.loaders', defaultMessage: 'Loaders' },
	domainRules: { id: 'app.skin-site.admin.mods.domain-rules', defaultMessage: 'Domain rules' },
	edit: { id: 'app.skin-site.admin.mods.edit', defaultMessage: 'Edit' },
	save: { id: 'app.skin-site.admin.mods.save', defaultMessage: 'Save' },
	cancel: { id: 'app.skin-site.admin.mods.cancel', defaultMessage: 'Cancel' },
	remove: { id: 'app.skin-site.admin.mods.remove', defaultMessage: 'Delete' },
	updated: { id: 'app.skin-site.admin.mods.updated', defaultMessage: 'Mod updated.' },
	deleted: { id: 'app.skin-site.admin.mods.deleted', defaultMessage: 'Mod deleted.' },
	confirmDelete: {
		id: 'app.skin-site.admin.mods.confirm-delete',
		defaultMessage: 'Delete mod “{name}”? This cannot be undone.',
	},
	ruleTags: { id: 'app.skin-site.admin.mods.rule-tags', defaultMessage: 'Rule tags' },
	tagName: { id: 'app.skin-site.admin.mods.tag-name', defaultMessage: 'Tag name' },
	tagRules: { id: 'app.skin-site.admin.mods.tag-rules', defaultMessage: 'Rules' },
	tagRulesHint: {
		id: 'app.skin-site.admin.mods.tag-rules-hint',
		defaultMessage: 'One rule per line.',
	},
	newTag: { id: 'app.skin-site.admin.mods.new-tag', defaultMessage: 'New tag' },
	tagCreated: { id: 'app.skin-site.admin.mods.tag-created', defaultMessage: 'Tag created.' },
	tagUpdated: { id: 'app.skin-site.admin.mods.tag-updated', defaultMessage: 'Tag updated.' },
	tagDeleted: { id: 'app.skin-site.admin.mods.tag-deleted', defaultMessage: 'Tag deleted.' },
	confirmDeleteTag: {
		id: 'app.skin-site.admin.mods.confirm-delete-tag',
		defaultMessage: 'Delete tag “{name}”?',
	},
	runtime: { id: 'app.skin-site.admin.mods.runtime', defaultMessage: 'Runtime releases' },
	manifestUrl: { id: 'app.skin-site.admin.mods.manifest-url', defaultMessage: 'Manifest URL' },
	uploadRuntime: {
		id: 'app.skin-site.admin.mods.upload-runtime',
		defaultMessage: 'Upload runtime',
	},
	runtimeVersion: {
		id: 'app.skin-site.admin.mods.runtime-version',
		defaultMessage: 'Version',
	},
	uploading: { id: 'app.skin-site.admin.mods.uploading', defaultMessage: 'Uploading…' },
	runtimeUploaded: {
		id: 'app.skin-site.admin.mods.runtime-uploaded',
		defaultMessage: 'Runtime uploaded.',
	},
	activate: { id: 'app.skin-site.admin.mods.activate', defaultMessage: 'Activate' },
	activated: { id: 'app.skin-site.admin.mods.activated', defaultMessage: 'Runtime activated.' },
	available: { id: 'app.skin-site.admin.mods.available', defaultMessage: 'Available' },
	unavailable: { id: 'app.skin-site.admin.mods.unavailable', defaultMessage: 'Unavailable' },
	active: { id: 'app.skin-site.admin.mods.active', defaultMessage: 'Active' },
	uploader: { id: 'app.skin-site.admin.mods.uploader', defaultMessage: 'by {name}' },
})

type Tab = 'mods' | 'tags' | 'runtime'
const tab = ref<Tab>('mods')

const PAGE_SIZE = 20

const mods = ref<SkinSiteModInfo[]>([])
const modTotal = ref(0)
const modOffset = ref(0)
const modLoading = ref(true)
const modFailed = ref(false)
const searchKeyword = ref('')
const tagFilter = ref<number | null>(null)

const editingHash = ref<string | null>(null)
const editForm = ref({ name: '', modId: '', version: '', domainRules: '' })
const savingMod = ref(false)
const deletingHash = ref<string | null>(null)

const tags = ref<SkinSiteModRuleTag[]>([])
const tagsLoading = ref(false)
const tagEditorOpen = ref(false)
const editingTagId = ref<number | null>(null)
const tagForm = ref({ name: '', rules: '' })
const savingTag = ref(false)

const runtimeState = ref<SkinSiteModRuntimeAdminState | null>(null)
const runtimeLoading = ref(false)
const runtimeVersion = ref('')
const runtimeFile = ref<HTMLInputElement | null>(null)
const runtimeUploading = ref(false)
const activatingRuntimeId = ref<number | null>(null)
const deletingRuntimeId = ref<number | null>(null)

const modPage = computed(() => Math.floor(modOffset.value / PAGE_SIZE) + 1)
const modPageCount = computed(() => Math.max(1, Math.ceil(modTotal.value / PAGE_SIZE)))
const hasPrev = computed(() => modOffset.value > 0)
const hasNext = computed(() => modOffset.value + PAGE_SIZE < modTotal.value)

function formatSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '—'
	const units = ['B', 'KB', 'MB', 'GB']
	let v = bytes
	let i = 0
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024
		i++
	}
	return v.toFixed(i === 0 ? 0 : 2) + ' ' + units[i]
}

function formatDateTime(ts?: number | null): string {
	if (!ts) return '—'
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return '—'
	}
}

async function loadMods(reset = true) {
	if (reset) {
		modLoading.value = true
		mods.value = []
		modOffset.value = 0
	}
	modFailed.value = false
	try {
		const kw = searchKeyword.value.trim()
		if (kw) {
			const result = await skinSiteModSearch(kw, tagFilter.value)
			if (!result.success) throw new Error(result.errorMessage)
			mods.value = result.payload ?? []
			modTotal.value = mods.value.length
		} else {
			const [listResult, countResult] = await Promise.all([
				skinSiteModList({
					limit: PAGE_SIZE,
					offset: modOffset.value,
					ruleTagId: tagFilter.value,
				}),
				skinSiteModCount({ ruleTagId: tagFilter.value }),
			])
			if (!listResult.success) throw new Error(listResult.errorMessage)
			mods.value = listResult.payload ?? []
			if (countResult.success && typeof countResult.payload === 'number') {
				modTotal.value = countResult.payload
			}
		}
	} catch (error) {
		modFailed.value = true
		handleError(error)
	} finally {
		modLoading.value = false
	}
}

function prevPage() {
	if (hasPrev.value) {
		modOffset.value = Math.max(0, modOffset.value - PAGE_SIZE)
		void loadMods(false)
	}
}
function nextPage() {
	if (hasNext.value) {
		modOffset.value += PAGE_SIZE
		void loadMods(false)
	}
}

async function loadTags() {
	tagsLoading.value = true
	try {
		const result = await skinSiteModRuleTags()
		if (result.success) tags.value = result.payload ?? []
	} catch (error) {
		handleError(error)
	} finally {
		tagsLoading.value = false
	}
}

async function loadRuntime() {
	runtimeLoading.value = true
	try {
		const result = await skinSiteModRuntimeReleases()
		if (result.success) runtimeState.value = result.payload
	} catch (error) {
		handleError(error)
	} finally {
		runtimeLoading.value = false
	}
}

async function switchTab(next: Tab) {
	tab.value = next
	if (next === 'tags' && !tags.value.length) await loadTags()
	if (next === 'runtime' && !runtimeState.value) await loadRuntime()
}

function startEdit(mod: SkinSiteModInfo) {
	editingHash.value = mod.hash
	editForm.value = {
		name: mod.metadata.name ?? mod.name,
		modId: mod.metadata.modId ?? '',
		version: mod.metadata.version ?? '',
		domainRules: mod.domainRules.join(', '),
	}
}

function cancelEdit() {
	editingHash.value = null
}

async function saveMod(mod: SkinSiteModInfo) {
	if (savingMod.value) return
	savingMod.value = true
	try {
		const payload: SkinSiteModInfo = {
			...mod,
			name: editForm.value.name.trim() || mod.name,
			domainRules: editForm.value.domainRules
				.split(',')
				.map((r) => r.trim())
				.filter(Boolean),
			metadata: {
				...mod.metadata,
				name: editForm.value.name.trim() || undefined,
				modId: editForm.value.modId.trim() || undefined,
				version: editForm.value.version.trim() || undefined,
			},
		}
		const result = await skinSiteUpdateModInfo(payload)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.updated) })
		cancelEdit()
		await loadMods(false)
	} catch (error) {
		handleError(error)
	} finally {
		savingMod.value = false
	}
}

async function removeMod(mod: SkinSiteModInfo) {
	if (deletingHash.value !== null) return
	if (!window.confirm(formatMessage(messages.confirmDelete, { name: mod.name }))) return
	deletingHash.value = mod.hash
	try {
		const result = await skinSiteDeleteModFile(mod.hash)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.deleted) })
		await loadMods(false)
	} catch (error) {
		handleError(error)
	} finally {
		deletingHash.value = null
	}
}

function openNewTag() {
	editingTagId.value = null
	tagForm.value = { name: '', rules: '' }
	tagEditorOpen.value = true
}

function openEditTag(tag: SkinSiteModRuleTag) {
	editingTagId.value = tag.id
	tagForm.value = { name: tag.name, rules: tag.rules.join('\n') }
	tagEditorOpen.value = true
}

function closeTagEditor() {
	tagEditorOpen.value = false
	tagForm.value = { name: '', rules: '' }
	editingTagId.value = null
}

async function saveTag() {
	const name = tagForm.value.name.trim()
	if (!name || savingTag.value) return
	savingTag.value = true
	try {
		const rules = tagForm.value.rules
			.split('\n')
			.map((r) => r.trim())
			.filter(Boolean)
		const result =
			editingTagId.value === null
				? await skinSiteCreateModRuleTag(name, rules)
				: await skinSiteUpdateModRuleTag(editingTagId.value, name, rules)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({
			type: 'success',
			title: formatMessage(editingTagId.value === null ? messages.tagCreated : messages.tagUpdated),
		})
		closeTagEditor()
		await loadTags()
	} catch (error) {
		handleError(error)
	} finally {
		savingTag.value = false
	}
}

async function removeTag(tag: SkinSiteModRuleTag) {
	if (!window.confirm(formatMessage(messages.confirmDeleteTag, { name: tag.name }))) return
	try {
		const result = await skinSiteDeleteModRuleTag(tag.id)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.tagDeleted) })
		if (tagFilter.value === tag.id) tagFilter.value = null
		await loadTags()
	} catch (error) {
		handleError(error)
	}
}

function pickRuntimeFile() {
	runtimeFile.value?.click()
}

async function onRuntimeFile(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	const version = runtimeVersion.value.trim()
	if (!file || !version || runtimeUploading.value) return
	runtimeUploading.value = true
	try {
		const result = await skinSiteUploadModRuntime(version, file)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.runtimeUploaded) })
		runtimeVersion.value = ''
		await loadRuntime()
	} catch (error) {
		handleError(error)
	} finally {
		runtimeUploading.value = false
	}
}

async function activateRuntime(release: SkinSiteModRuntimeRelease) {
	if (activatingRuntimeId.value !== null) return
	activatingRuntimeId.value = release.id
	try {
		const result = await skinSiteActivateModRuntime(release.id)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.activated) })
		await loadRuntime()
	} catch (error) {
		handleError(error)
	} finally {
		activatingRuntimeId.value = null
	}
}

async function removeRuntime(release: SkinSiteModRuntimeRelease) {
	if (deletingRuntimeId.value !== null) return
	deletingRuntimeId.value = release.id
	try {
		const result = await skinSiteDeleteModRuntime(release.id)
		if (!result.success) throw new Error(result.errorMessage)
		await loadRuntime()
	} catch (error) {
		handleError(error)
	} finally {
		deletingRuntimeId.value = null
	}
}

onMounted(async () => {
	await loadTags()
	await loadMods(true)
})
</script>
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold"
				:class="tab === 'mods' ? 'bg-brand text-contrast' : 'bg-button-bg text-secondary'"
				@click="switchTab('mods')"
			>
				{{ formatMessage(messages.tabMods) }}
			</button>
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold"
				:class="tab === 'tags' ? 'bg-brand text-contrast' : 'bg-button-bg text-secondary'"
				@click="switchTab('tags')"
			>
				{{ formatMessage(messages.tabTags) }}
			</button>
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold"
				:class="tab === 'runtime' ? 'bg-brand text-contrast' : 'bg-button-bg text-secondary'"
				@click="switchTab('runtime')"
			>
				{{ formatMessage(messages.tabRuntime) }}
			</button>
		</div>

		<template v-if="tab === 'mods'">
			<div class="flex flex-wrap items-center gap-2">
				<input
					v-model="searchKeyword"
					type="text"
					:placeholder="formatMessage(messages.search)"
					class="min-w-0 flex-1 rounded-full border border-solid border-surface-5 bg-bg px-3 py-1 text-xs text-contrast outline-none focus:border-brand"
					@keyup.enter="loadMods(true)"
				/>
				<select
					v-model="tagFilter"
					class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
					@change="loadMods(true)"
				>
					<option :value="null">{{ formatMessage(messages.filterAll) }}</option>
					<option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
				</select>
				<span class="text-xs text-secondary">
					{{ formatMessage(messages.total, { count: modTotal }) }}
				</span>
			</div>

			<div v-if="modLoading" class="flex items-center gap-2 text-sm text-secondary">
				<SpinnerIcon class="size-4 animate-spin" />
				{{ formatMessage(messages.loading) }}
			</div>
			<p v-else-if="modFailed" class="m-0 text-sm text-secondary">
				{{ formatMessage(messages.failed) }}
			</p>
			<p v-else-if="!mods.length" class="m-0 rounded-xl bg-bg-raised p-4 text-sm text-secondary">
				{{ formatMessage(messages.empty) }}
			</p>
			<div v-else class="flex flex-col gap-2">
				<div
					v-for="mod in mods"
					:key="mod.hash"
					class="flex flex-col gap-2 rounded-xl bg-bg-raised p-3"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
							{{ mod.metadata.name || mod.name }}
						</span>
						<span class="shrink-0 text-xs text-secondary">{{ formatSize(mod.size) }}</span>
						<span
							v-for="loader in mod.metadata.loaderType"
							:key="loader"
							class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
						>
							{{ loader }}
						</span>
					</div>
					<span class="truncate font-mono text-[10px] text-secondary">{{ mod.hash }}</span>

					<div v-if="editingHash === mod.hash" class="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<label class="flex flex-col gap-1">
							<span class="text-xs text-secondary">{{ formatMessage(messages.name) }}</span>
							<input
								v-model="editForm.name"
								type="text"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs text-secondary">{{ formatMessage(messages.modId) }}</span>
							<input
								v-model="editForm.modId"
								type="text"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs text-secondary">{{ formatMessage(messages.version) }}</span>
							<input
								v-model="editForm.version"
								type="text"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1 sm:col-span-3">
							<span class="text-xs text-secondary">{{ formatMessage(messages.domainRules) }}</span>
							<input
								v-model="editForm.domainRules"
								type="text"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
							/>
						</label>
					</div>

					<div class="flex flex-wrap gap-2">
						<template v-if="editingHash === mod.hash">
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
								:disabled="savingMod"
								@click="saveMod(mod)"
							>
								{{ formatMessage(messages.save) }}
							</button>
						</template>
						<template v-else>
							<span
								v-for="rule in mod.domainRules"
								:key="rule"
								class="rounded bg-bg px-2 py-0.5 font-mono text-[10px] text-secondary"
							>
								{{ rule }}
							</span>
							<button
								type="button"
								class="ml-auto rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
								@click="startEdit(mod)"
							>
								{{ formatMessage(messages.edit) }}
							</button>
							<button
								type="button"
								class="rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
								:disabled="deletingHash !== null"
								@click="removeMod(mod)"
							>
								{{ formatMessage(messages.remove) }}
							</button>
						</template>
					</div>
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
						{{ formatMessage(messages.page, { page: modPage }) }} / {{ modPageCount }}
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
		</template>
		<template v-else-if="tab === 'tags'">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
					@click="openNewTag"
				>
					{{ formatMessage(messages.newTag) }}
				</button>
			</div>

			<div v-if="tagsLoading" class="flex items-center gap-2 text-sm text-secondary">
				<SpinnerIcon class="size-4 animate-spin" />
				{{ formatMessage(messages.loading) }}
			</div>
			<div v-else-if="!tags.length" class="rounded-xl bg-bg-raised p-4 text-sm text-secondary">
				{{ formatMessage(messages.empty) }}
			</div>
			<div v-else class="flex flex-col gap-2">
				<div
					v-for="tag in tags"
					:key="tag.id"
					class="flex flex-wrap items-center gap-2 rounded-xl bg-bg-raised p-3"
				>
					<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
						{{ tag.name }}
					</span>
					<span class="text-xs text-secondary">×{{ tag.rules.length }}</span>
					<button
						type="button"
						class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="openEditTag(tag)"
					>
						{{ formatMessage(messages.edit) }}
					</button>
					<button
						type="button"
						class="rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="removeTag(tag)"
					>
						{{ formatMessage(messages.remove) }}
					</button>
				</div>
			</div>

			<div
				v-if="tagEditorOpen"
				class="flex flex-col gap-2 rounded-xl border border-solid border-surface-5 bg-bg-raised p-4"
			>
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold text-contrast">
						{{ formatMessage(messages.tagName) }}
					</span>
					<input
						v-model="tagForm.name"
						type="text"
						class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold text-contrast">
						{{ formatMessage(messages.tagRules) }}
					</span>
					<textarea
						v-model="tagForm.rules"
						rows="5"
						:placeholder="formatMessage(messages.tagRulesHint)"
						class="w-full resize-y rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 font-mono text-xs text-contrast outline-none focus:border-brand"
					/>
				</label>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-full bg-button-bg px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
						@click="closeTagEditor"
					>
						{{ formatMessage(messages.cancel) }}
					</button>
					<button
						type="button"
						class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast disabled:opacity-50"
						:disabled="savingTag || !tagForm.name.trim()"
						@click="saveTag"
					>
						{{ formatMessage(messages.save) }}
					</button>
				</div>
			</div>
		</template>
		<template v-else>
			<div class="flex flex-wrap items-center gap-2">
				<input ref="runtimeFile" type="file" class="hidden" @change="onRuntimeFile" />
				<input
					v-model="runtimeVersion"
					type="text"
					:placeholder="formatMessage(messages.runtimeVersion)"
					class="w-40 rounded-lg border border-solid border-surface-5 bg-bg px-3 py-1.5 text-xs text-contrast outline-none focus:border-brand"
				/>
				<button
					type="button"
					class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="runtimeUploading || !runtimeVersion.trim()"
					@click="pickRuntimeFile"
				>
					{{
						runtimeUploading
							? formatMessage(messages.uploading)
							: formatMessage(messages.uploadRuntime)
					}}
				</button>
			</div>

			<div
				v-if="runtimeState && runtimeState.manifestUrl"
				class="flex flex-wrap items-center gap-2 rounded-xl bg-bg-raised p-3"
			>
				<span class="text-xs font-semibold text-contrast">
					{{ formatMessage(messages.manifestUrl) }}
				</span>
				<code class="min-w-0 flex-1 truncate text-xs text-secondary">
					{{ runtimeState.manifestUrl }}
				</code>
			</div>

			<div v-if="runtimeLoading" class="flex items-center gap-2 text-sm text-secondary">
				<SpinnerIcon class="size-4 animate-spin" />
				{{ formatMessage(messages.loading) }}
			</div>
			<p
				v-else-if="!runtimeState || !runtimeState.releases.length"
				class="m-0 rounded-xl bg-bg-raised p-4 text-sm text-secondary"
			>
				{{ formatMessage(messages.empty) }}
			</p>
			<div v-else class="flex flex-col gap-2">
				<div
					v-for="release in runtimeState.releases"
					:key="release.id"
					class="flex flex-wrap items-center gap-3 rounded-xl bg-bg-raised p-3"
				>
					<div class="flex min-w-0 flex-1 flex-col">
						<span class="truncate text-sm font-semibold text-contrast">
							{{ release.version }}
							<span class="text-xs font-normal text-secondary">#{{ release.id }}</span>
						</span>
						<span class="truncate text-xs text-secondary">
							{{ formatMessage(messages.uploader, { name: release.uploadedBy }) }} ·
							{{ formatDateTime(release.uploadedAt) }}
						</span>
					</div>
					<span class="shrink-0 text-xs text-secondary">
						{{ formatSize(release.fileSize) }}
					</span>
					<span
						v-if="release.active"
						class="shrink-0 rounded-full bg-green px-2 py-0.5 text-[10px] font-semibold text-contrast"
					>
						{{ formatMessage(messages.active) }}
					</span>
					<span
						class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
						:class="release.available ? 'bg-button-bg text-secondary' : 'bg-orange text-contrast'"
					>
						{{
							release.available
								? formatMessage(messages.available)
								: formatMessage(messages.unavailable)
						}}
					</span>
					<button
						v-if="!release.active"
						type="button"
						class="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="activatingRuntimeId !== null"
						@click="activateRuntime(release)"
					>
						{{ formatMessage(messages.activate) }}
					</button>
					<button
						type="button"
						class="shrink-0 rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="deletingRuntimeId !== null || release.active"
						@click="removeRuntime(release)"
					>
						{{ formatMessage(messages.remove) }}
					</button>
				</div>
			</div>
		</template>
	</div>
</template>
