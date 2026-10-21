<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	skinSiteActivateLauncherRelease,
	skinSiteDeleteLauncherRelease,
	type SkinSiteLauncherAdminState,
	skinSiteLauncherAdminState,
	type SkinSiteLauncherRelease,
	skinSiteUploadLauncherRelease,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.launcher.title', defaultMessage: 'Launcher releases' },
	loading: { id: 'app.skin-site.admin.launcher.loading', defaultMessage: 'Loading…' },
	failed: {
		id: 'app.skin-site.admin.launcher.failed',
		defaultMessage: 'Could not load releases.',
	},
	empty: { id: 'app.skin-site.admin.launcher.empty', defaultMessage: 'No releases uploaded yet.' },
	latestUrl: { id: 'app.skin-site.admin.launcher.latest-url', defaultMessage: 'Latest URL' },
	version: { id: 'app.skin-site.admin.launcher.version', defaultMessage: 'Version' },
	channel: { id: 'app.skin-site.admin.launcher.channel', defaultMessage: 'Channel' },
	uploader: { id: 'app.skin-site.admin.launcher.uploader', defaultMessage: 'Uploaded by' },
	uploadedAt: { id: 'app.skin-site.admin.launcher.uploaded-at', defaultMessage: 'Uploaded' },
	publishedAt: { id: 'app.skin-site.admin.launcher.published-at', defaultMessage: 'Published' },
	forceUpdate: { id: 'app.skin-site.admin.launcher.force-update', defaultMessage: 'Forced' },
	active: { id: 'app.skin-site.admin.launcher.active', defaultMessage: 'Active' },
	activate: { id: 'app.skin-site.admin.launcher.activate', defaultMessage: 'Activate' },
	activated: { id: 'app.skin-site.admin.launcher.activated', defaultMessage: 'Release activated.' },
	deleteRelease: {
		id: 'app.skin-site.admin.launcher.delete',
		defaultMessage: 'Delete release',
	},
	confirmDelete: {
		id: 'app.skin-site.admin.launcher.confirm-delete',
		defaultMessage:
			'Permanently delete launcher {version} and all its installation files from the server? This version will no longer be available for download or rollback. Installed launchers will not be affected.',
	},
	deleted: {
		id: 'app.skin-site.admin.launcher.deleted',
		defaultMessage: 'Release and its installation files deleted.',
	},
	upload: { id: 'app.skin-site.admin.launcher.upload', defaultMessage: 'Upload release' },
	uploadHint: {
		id: 'app.skin-site.admin.launcher.upload-hint',
		defaultMessage: 'Choose a release ZIP (max 4 GiB).',
	},
	uploading: { id: 'app.skin-site.admin.launcher.uploading', defaultMessage: 'Uploading…' },
	uploadDone: {
		id: 'app.skin-site.admin.launcher.upload-done',
		defaultMessage: 'Release uploaded.',
	},
	forceFlag: {
		id: 'app.skin-site.admin.launcher.force-flag',
		defaultMessage: 'Force update',
	},
	prev: { id: 'app.skin-site.admin.launcher.prev', defaultMessage: 'Previous' },
	next: { id: 'app.skin-site.admin.launcher.next', defaultMessage: 'Next' },
	page: { id: 'app.skin-site.admin.launcher.page', defaultMessage: 'Page {page}' },
	total: { id: 'app.skin-site.admin.launcher.total', defaultMessage: '{count} releases' },
})

const PAGE_SIZE = 10

const state = ref<SkinSiteLauncherAdminState | null>(null)
const loading = ref(true)
const failed = ref(false)
const offset = ref(0)

const uploading = ref(false)
const uploadPercent = ref(0)
const forceUpdate = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const activatingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const mutating = computed(
	() => uploading.value || activatingId.value !== null || deletingId.value !== null,
)

const releases = computed(() => state.value?.releases ?? [])
const total = computed(() => releases.value.length)
const page = computed(() => Math.floor(offset.value / PAGE_SIZE) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const hasPrev = computed(() => offset.value > 0)
const hasNext = computed(() => offset.value + PAGE_SIZE < total.value)
const visible = computed(() => releases.value.slice(offset.value, offset.value + PAGE_SIZE))

function formatDateTime(ts?: number | null): string {
	if (!ts) return '—'
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return '—'
	}
}

async function load() {
	loading.value = true
	failed.value = false
	try {
		const result = await skinSiteLauncherAdminState()
		if (!result.success) throw new Error(result.errorMessage)
		state.value = result.payload
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
	}
}

function prevPage() {
	if (hasPrev.value) offset.value = Math.max(0, offset.value - PAGE_SIZE)
}
function nextPage() {
	if (hasNext.value) offset.value += PAGE_SIZE
}

async function activate(release: SkinSiteLauncherRelease) {
	if (release.active || mutating.value || loading.value) return
	activatingId.value = release.id
	try {
		const result = await skinSiteActivateLauncherRelease(release.id)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.activated) })
		await load()
	} catch (error) {
		handleError(error)
	} finally {
		activatingId.value = null
	}
}

async function remove(release: SkinSiteLauncherRelease) {
	if (release.active || mutating.value || loading.value) return
	if (!window.confirm(formatMessage(messages.confirmDelete, { version: release.version }))) return
	deletingId.value = release.id
	try {
		const result = await skinSiteDeleteLauncherRelease(release.id)
		if (!result.success) throw new Error(result.errorMessage)
		if (state.value)
			state.value.releases = state.value.releases.filter((item) => item.id !== release.id)
		offset.value = Math.min(offset.value, Math.max(0, (pageCount.value - 1) * PAGE_SIZE))
		addNotification({ type: 'success', title: formatMessage(messages.deleted) })
	} catch (error) {
		handleError(error)
	} finally {
		deletingId.value = null
	}
}

function pickFile() {
	fileInput.value?.click()
}

async function onFileChosen(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file || mutating.value || loading.value) return
	uploading.value = true
	uploadPercent.value = 0
	try {
		const result = await skinSiteUploadLauncherRelease(
			file,
			forceUpdate.value,
			(p) => (uploadPercent.value = Math.round(p)),
		)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.uploadDone) })
		offset.value = 0
		await load()
	} catch (error) {
		handleError(error)
	} finally {
		uploading.value = false
		uploadPercent.value = 0
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

		<div
			v-if="state && state.latestUrl"
			class="flex flex-wrap items-center gap-2 rounded-xl bg-bg-raised p-3"
		>
			<span class="text-xs font-semibold text-contrast">
				{{ formatMessage(messages.latestUrl) }}
			</span>
			<code class="min-w-0 flex-1 truncate text-xs text-secondary">{{ state.latestUrl }}</code>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<input
				ref="fileInput"
				type="file"
				accept=".zip,application/zip"
				class="hidden"
				@change="onFileChosen"
			/>
			<button
				type="button"
				class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
				:disabled="mutating || loading"
				@click="pickFile"
			>
				{{ formatMessage(messages.upload) }}
			</button>
			<label class="flex items-center gap-2 text-xs text-contrast">
				<input v-model="forceUpdate" type="checkbox" :disabled="uploading" />
				{{ formatMessage(messages.forceFlag) }}
			</label>
			<span class="text-xs text-secondary">{{ formatMessage(messages.uploadHint) }}</span>
		</div>

		<div v-if="uploading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.uploading) }} {{ uploadPercent }}%
		</div>

		<div v-if="loading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p v-else-if="failed" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
		</p>
		<p v-else-if="!total" class="m-0 rounded-xl bg-bg-raised p-4 text-sm text-secondary">
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="flex flex-col gap-2">
			<div
				v-for="release in visible"
				:key="release.id"
				class="flex flex-wrap items-center gap-3 rounded-xl bg-bg-raised p-3"
			>
				<div class="flex min-w-0 flex-1 flex-col">
					<span class="truncate text-sm font-semibold text-contrast">
						{{ release.version }}
						<span class="text-xs font-normal text-secondary">#{{ release.id }}</span>
					</span>
					<span class="truncate text-xs text-secondary">
						{{ formatMessage(messages.uploader) }}: {{ release.uploadedBy }} ·
						{{ formatDateTime(release.uploadedAt) }}
					</span>
				</div>
				<span
					class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
				>
					{{ release.channel }}
				</span>
				<span
					v-if="release.forceUpdate"
					class="shrink-0 rounded-full bg-orange px-2 py-0.5 text-[10px] font-semibold text-contrast"
				>
					{{ formatMessage(messages.forceUpdate) }}
				</span>
				<span
					v-if="release.active"
					class="shrink-0 rounded-full bg-green px-2 py-0.5 text-[10px] font-semibold text-contrast"
				>
					{{ formatMessage(messages.active) }}
				</span>
				<button
					v-if="!release.active"
					type="button"
					class="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="mutating"
					@click="activate(release)"
				>
					{{ formatMessage(messages.activate) }}
				</button>
				<button
					v-if="!release.active"
					type="button"
					class="flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-red hover:brightness-110 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
					:disabled="mutating"
					@click="remove(release)"
				>
					<SpinnerIcon v-if="deletingId === release.id" class="size-3 animate-spin" />
					{{ formatMessage(messages.deleteRelease) }}
				</button>
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
