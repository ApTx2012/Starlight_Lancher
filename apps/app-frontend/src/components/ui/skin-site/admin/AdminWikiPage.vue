<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	skinSiteWikiAudit,
	type SkinSiteWikiAuditInfo,
	type SkinSiteWikiEditPolicy,
	skinSiteWikiPage,
	type SkinSiteWikiPageDetail,
	skinSiteWikiProtectPage,
	type SkinSiteWikiReadPolicy,
	skinSiteWikiSetHomePage,
	skinSiteWikiSetPageDeleted,
	type SkinSiteWikiSettings,
	skinSiteWikiSettings,
	skinSiteWikiUpdateSettings,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.wiki.title', defaultMessage: 'Wiki' },
	tabPage: { id: 'app.skin-site.admin.wiki.tab-page', defaultMessage: 'Page' },
	tabAudit: { id: 'app.skin-site.admin.wiki.tab-audit', defaultMessage: 'Audit log' },
	tabSettings: { id: 'app.skin-site.admin.wiki.tab-settings', defaultMessage: 'Settings' },
	loading: { id: 'app.skin-site.admin.wiki.loading', defaultMessage: 'Loading…' },
	pagePath: { id: 'app.skin-site.admin.wiki.page-path', defaultMessage: 'Page path' },
	loadPage: { id: 'app.skin-site.admin.wiki.load-page', defaultMessage: 'Load page' },
	pageNotFound: {
		id: 'app.skin-site.admin.wiki.page-not-found',
		defaultMessage: 'Page not found.',
	},
	revision: { id: 'app.skin-site.admin.wiki.revision', defaultMessage: 'Revision' },
	author: { id: 'app.skin-site.admin.wiki.author', defaultMessage: 'Author' },
	updatedAt: { id: 'app.skin-site.admin.wiki.updated-at', defaultMessage: 'Updated' },
	categories: { id: 'app.skin-site.admin.wiki.categories', defaultMessage: 'Categories' },
	readPolicy: { id: 'app.skin-site.admin.wiki.read-policy', defaultMessage: 'Read policy' },
	editPolicy: { id: 'app.skin-site.admin.wiki.edit-policy', defaultMessage: 'Edit policy' },
	saveProtect: { id: 'app.skin-site.admin.wiki.save-protect', defaultMessage: 'Save policies' },
	protectSaved: {
		id: 'app.skin-site.admin.wiki.protect-saved',
		defaultMessage: 'Page policies updated.',
	},
	setHome: { id: 'app.skin-site.admin.wiki.set-home', defaultMessage: 'Set as home page' },
	homeSet: { id: 'app.skin-site.admin.wiki.home-set', defaultMessage: 'Home page updated.' },
	setDeleted: { id: 'app.skin-site.admin.wiki.set-deleted', defaultMessage: 'Mark as deleted' },
	setRestored: { id: 'app.skin-site.admin.wiki.set-restored', defaultMessage: 'Restore page' },
	deletedUpdated: {
		id: 'app.skin-site.admin.wiki.deleted-updated',
		defaultMessage: 'Page deletion state updated.',
	},
	auditEmpty: { id: 'app.skin-site.admin.wiki.audit-empty', defaultMessage: 'No audit entries.' },
	auditTarget: { id: 'app.skin-site.admin.wiki.audit-target', defaultMessage: 'Target' },
	loadMore: { id: 'app.skin-site.admin.wiki.load-more', defaultMessage: 'Load more' },
	settingsHint: {
		id: 'app.skin-site.admin.wiki.settings-hint',
		defaultMessage: 'Comma separated domains.',
	},
	domains: { id: 'app.skin-site.admin.wiki.domains', defaultMessage: 'Domains' },
	homePage: { id: 'app.skin-site.admin.wiki.home-page', defaultMessage: 'Home page' },
	defaultSkin: { id: 'app.skin-site.admin.wiki.default-skin', defaultMessage: 'Default skin' },
	maxPageBytes: {
		id: 'app.skin-site.admin.wiki.max-page-bytes',
		defaultMessage: 'Max page bytes',
	},
	maxAttachmentBytes: {
		id: 'app.skin-site.admin.wiki.max-attachment-bytes',
		defaultMessage: 'Max attachment bytes',
	},
	saveSettings: { id: 'app.skin-site.admin.wiki.save-settings', defaultMessage: 'Save settings' },
	settingsSaved: {
		id: 'app.skin-site.admin.wiki.settings-saved',
		defaultMessage: 'Settings saved.',
	},
})

type Tab = 'page' | 'audit' | 'settings'
const tab = ref<Tab>('page')

const pagePath = ref('')
const page = ref<SkinSiteWikiPageDetail | null>(null)
const pageLoading = ref(false)
const pageError = ref(false)
const protectRead = ref<SkinSiteWikiReadPolicy>('PUBLIC')
const protectEdit = ref<SkinSiteWikiEditPolicy>('MEMBER')
const savingProtect = ref(false)

const auditItems = ref<SkinSiteWikiAuditInfo[]>([])
const auditNext = ref<number | null>(null)
const auditLoading = ref(false)
const auditLoadingMore = ref(false)

const settings = ref<SkinSiteWikiSettings | null>(null)
const settingsLoading = ref(false)
const settingsSaving = ref(false)
const settingsForm = ref({
	domains: '',
	homePage: '',
	defaultSkin: '',
	maxPageUtf8Bytes: 0,
	maxAttachmentBytes: 0,
})

function formatDateTime(ts: number): string {
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ''
	}
}

async function loadPage() {
	const path = pagePath.value.trim()
	if (!path) return
	pageLoading.value = true
	pageError.value = false
	page.value = null
	try {
		const result = await skinSiteWikiPage(path)
		if (!result.success) throw new Error(result.errorMessage)
		page.value = result.payload
		protectRead.value = result.payload.readPolicy
		protectEdit.value = result.payload.editPolicy
	} catch (error) {
		pageError.value = true
		handleError(error)
	} finally {
		pageLoading.value = false
	}
}

async function saveProtect() {
	if (!page.value || savingProtect.value) return
	savingProtect.value = true
	try {
		const result = await skinSiteWikiProtectPage(
			pagePath.value.trim(),
			protectRead.value,
			protectEdit.value,
		)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.protectSaved) })
		await loadPage()
	} catch (error) {
		handleError(error)
	} finally {
		savingProtect.value = false
	}
}

async function setHome() {
	if (!page.value) return
	try {
		const result = await skinSiteWikiSetHomePage(pagePath.value.trim())
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.homeSet) })
	} catch (error) {
		handleError(error)
	}
}

async function toggleDeleted() {
	if (!page.value) return
	try {
		const result = await skinSiteWikiSetPageDeleted(pagePath.value.trim(), !page.value.canEdit)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.deletedUpdated) })
		await loadPage()
	} catch (error) {
		handleError(error)
	}
}

async function loadAudit(reset = true) {
	if (reset) {
		auditLoading.value = true
		auditItems.value = []
		auditNext.value = null
	} else {
		auditLoadingMore.value = true
	}
	try {
		const result = await skinSiteWikiAudit(reset ? undefined : (auditNext.value ?? undefined))
		if (!result.success) throw new Error(result.errorMessage)
		const data = result.payload
		auditItems.value = reset ? data.items : [...auditItems.value, ...data.items]
		auditNext.value = data.nextCursor ?? null
	} catch (error) {
		handleError(error)
	} finally {
		auditLoading.value = false
		auditLoadingMore.value = false
	}
}

async function loadSettings() {
	settingsLoading.value = true
	try {
		const result = await skinSiteWikiSettings()
		if (!result.success) throw new Error(result.errorMessage)
		settings.value = result.payload
		settingsForm.value = {
			domains: result.payload.domains.join(', '),
			homePage: result.payload.homePage,
			defaultSkin: result.payload.defaultSkin,
			maxPageUtf8Bytes: result.payload.maxPageUtf8Bytes,
			maxAttachmentBytes: result.payload.maxAttachmentBytes,
		}
	} catch (error) {
		handleError(error)
	} finally {
		settingsLoading.value = false
	}
}

async function saveSettings() {
	if (settingsSaving.value) return
	settingsSaving.value = true
	try {
		const result = await skinSiteWikiUpdateSettings({
			domains: settingsForm.value.domains
				.split(',')
				.map((d) => d.trim())
				.filter(Boolean),
			homePage: settingsForm.value.homePage.trim(),
			defaultSkin: settingsForm.value.defaultSkin.trim(),
			maxPageUtf8Bytes: Number(settingsForm.value.maxPageUtf8Bytes) || 0,
			maxAttachmentBytes: Number(settingsForm.value.maxAttachmentBytes) || 0,
		})
		if (!result.success) throw new Error(result.errorMessage)
		settings.value = result.payload
		addNotification({ type: 'success', title: formatMessage(messages.settingsSaved) })
	} catch (error) {
		handleError(error)
	} finally {
		settingsSaving.value = false
	}
}

async function switchTab(next: Tab) {
	tab.value = next
	if (next === 'audit' && !auditItems.value.length) await loadAudit(true)
	if (next === 'settings' && !settings.value) await loadSettings()
}

onMounted(() => void loadSettings())
</script>
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold"
				:class="tab === 'page' ? 'bg-brand text-contrast' : 'bg-button-bg text-secondary'"
				@click="switchTab('page')"
			>
				{{ formatMessage(messages.tabPage) }}
			</button>
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold"
				:class="tab === 'audit' ? 'bg-brand text-contrast' : 'bg-button-bg text-secondary'"
				@click="switchTab('audit')"
			>
				{{ formatMessage(messages.tabAudit) }}
			</button>
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold"
				:class="tab === 'settings' ? 'bg-brand text-contrast' : 'bg-button-bg text-secondary'"
				@click="switchTab('settings')"
			>
				{{ formatMessage(messages.tabSettings) }}
			</button>
		</div>

		<template v-if="tab === 'page'">
			<div class="flex flex-wrap items-center gap-2">
				<input
					v-model="pagePath"
					type="text"
					:placeholder="formatMessage(messages.pagePath)"
					class="min-w-0 flex-1 rounded-full border border-solid border-surface-5 bg-bg px-3 py-1 text-xs text-contrast outline-none focus:border-brand"
					@keyup.enter="loadPage"
				/>
				<button
					type="button"
					class="rounded-full bg-brand px-4 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="pageLoading || !pagePath.trim()"
					@click="loadPage"
				>
					{{ formatMessage(messages.loadPage) }}
				</button>
			</div>

			<div v-if="pageLoading" class="flex items-center gap-2 text-sm text-secondary">
				<SpinnerIcon class="size-4 animate-spin" />
				{{ formatMessage(messages.loading) }}
			</div>
			<p v-else-if="pageError" class="m-0 text-sm text-secondary">
				{{ formatMessage(messages.pageNotFound) }}
			</p>
			<template v-else-if="page">
				<div class="flex flex-col gap-2 rounded-xl bg-bg-raised p-4">
					<div class="flex flex-wrap items-center gap-2">
						<span class="min-w-0 flex-1 truncate text-lg font-bold text-contrast">
							{{ page.title }}
						</span>
						<span class="shrink-0 text-xs text-secondary">
							{{ formatMessage(messages.revision) }} #{{ page.revisionId }}
						</span>
					</div>
					<div class="flex flex-wrap items-center gap-3 text-xs text-secondary">
						<span>{{ formatMessage(messages.author) }}: {{ page.authorName }}</span>
						<span>
							{{ formatMessage(messages.updatedAt) }}:
							{{ formatDateTime(page.updatedAt) }}
						</span>
					</div>
					<div v-if="page.categories.length" class="flex flex-wrap items-center gap-1">
						<span class="text-xs text-secondary"> {{ formatMessage(messages.categories) }}: </span>
						<span
							v-for="c in page.categories"
							:key="c"
							class="rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
						>
							{{ c }}
						</span>
					</div>
					<p
						v-if="page.summary"
						class="m-0 rounded-lg bg-bg p-2 text-xs whitespace-pre-wrap break-words text-secondary"
					>
						{{ page.summary }}
					</p>
				</div>

				<div class="flex flex-wrap items-end gap-3 rounded-xl bg-bg-raised p-4">
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.readPolicy) }}
						</span>
						<select
							v-model="protectRead"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast"
						>
							<option value="PUBLIC">PUBLIC</option>
							<option value="MEMBER">MEMBER</option>
						</select>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.editPolicy) }}
						</span>
						<select
							v-model="protectEdit"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast"
						>
							<option value="MEMBER">MEMBER</option>
							<option value="WEB_ADMIN">WEB_ADMIN</option>
						</select>
					</label>
					<button
						type="button"
						class="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="savingProtect"
						@click="saveProtect"
					>
						{{ formatMessage(messages.saveProtect) }}
					</button>
					<button
						type="button"
						class="rounded-full bg-button-bg px-4 py-1.5 text-xs font-semibold text-contrast hover:brightness-110"
						@click="setHome"
					>
						{{ formatMessage(messages.setHome) }}
					</button>
					<button
						type="button"
						class="rounded-full bg-red px-4 py-1.5 text-xs font-semibold text-contrast hover:brightness-110"
						@click="toggleDeleted"
					>
						{{
							page.canEdit
								? formatMessage(messages.setDeleted)
								: formatMessage(messages.setRestored)
						}}
					</button>
				</div>
			</template>
		</template>
		<template v-else-if="tab === 'audit'">
			<div v-if="auditLoading" class="flex items-center gap-2 text-sm text-secondary">
				<SpinnerIcon class="size-4 animate-spin" />
				{{ formatMessage(messages.loading) }}
			</div>
			<p
				v-else-if="!auditItems.length"
				class="m-0 rounded-xl bg-bg-raised p-4 text-sm text-secondary"
			>
				{{ formatMessage(messages.auditEmpty) }}
			</p>
			<div v-else class="flex flex-col gap-2">
				<div
					v-for="entry in auditItems"
					:key="entry.id"
					class="flex flex-col gap-1 rounded-xl bg-bg-raised p-3"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span class="shrink-0 text-xs text-secondary">#{{ entry.id }}</span>
						<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
							{{ entry.action }}
						</span>
						<span class="shrink-0 text-xs text-secondary">{{ entry.actorName }}</span>
						<span class="shrink-0 text-xs text-secondary">
							{{ formatDateTime(entry.createdAt) }}
						</span>
					</div>
					<span v-if="entry.target" class="truncate text-xs text-secondary">
						{{ formatMessage(messages.auditTarget) }}: {{ entry.target }}
					</span>
					<span v-if="entry.detail" class="truncate text-xs text-secondary">
						{{ entry.detail }}
					</span>
				</div>

				<button
					v-if="auditNext !== null"
					type="button"
					class="w-fit self-center rounded-full bg-button-bg px-4 py-2 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="auditLoadingMore"
					@click="loadAudit(false)"
				>
					{{ formatMessage(messages.loadMore) }}
				</button>
			</div>
		</template>
		<template v-else>
			<div v-if="settingsLoading" class="flex items-center gap-2 text-sm text-secondary">
				<SpinnerIcon class="size-4 animate-spin" />
				{{ formatMessage(messages.loading) }}
			</div>
			<template v-else-if="settings">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="flex flex-col gap-1 sm:col-span-2">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.domains) }}
						</span>
						<input
							v-model="settingsForm.domains"
							type="text"
							:placeholder="formatMessage(messages.settingsHint)"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.homePage) }}
						</span>
						<input
							v-model="settingsForm.homePage"
							type="text"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.defaultSkin) }}
						</span>
						<input
							v-model="settingsForm.defaultSkin"
							type="text"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.maxPageBytes) }}
						</span>
						<input
							v-model.number="settingsForm.maxPageUtf8Bytes"
							type="number"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.maxAttachmentBytes) }}
						</span>
						<input
							v-model.number="settingsForm.maxAttachmentBytes"
							type="number"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						/>
					</label>
				</div>
				<button
					type="button"
					class="w-fit rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
					:disabled="settingsSaving"
					@click="saveSettings"
				>
					{{ formatMessage(messages.saveSettings) }}
				</button>
			</template>
		</template>
	</div>
</template>
