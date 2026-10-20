<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	skinSiteWikiAudit,
	type SkinSiteWikiAuditInfo,
	type SkinSiteWikiEditPolicy,
	type SkinSiteWikiMigrationCandidate,
	skinSiteWikiMigrationCandidates,
	skinSiteWikiMigrationDecide,
	skinSiteWikiMigrationDelete,
	type SkinSiteWikiMigrationJobInfo,
	skinSiteWikiMigrationJobs,
	skinSiteWikiMigrationPublish,
	skinSiteWikiMigrationRollback,
	skinSiteWikiMigrationStartAutomatic,
	skinSiteWikiMigrationStartXml,
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
	policyPublic: { id: 'app.skin-site.admin.wiki.policy-public', defaultMessage: 'Everyone' },
	policyMember: { id: 'app.skin-site.admin.wiki.policy-member', defaultMessage: 'Members' },
	policyAdmin: {
		id: 'app.skin-site.admin.wiki.policy-admin',
		defaultMessage: 'Website administrators',
	},
	title: { id: 'app.skin-site.admin.wiki.title', defaultMessage: 'Wiki' },
	tabPage: { id: 'app.skin-site.admin.wiki.tab-page', defaultMessage: 'Page' },
	tabAudit: { id: 'app.skin-site.admin.wiki.tab-audit', defaultMessage: 'Audit log' },
	tabSettings: { id: 'app.skin-site.admin.wiki.tab-settings', defaultMessage: 'Settings' },
	tabMigration: { id: 'app.skin-site.admin.wiki.tab-migration', defaultMessage: 'Migration' },
	migrationTitle: {
		id: 'app.skin-site.admin.wiki.migration-title',
		defaultMessage: 'MediaWiki migration',
	},
	migrationHint: {
		id: 'app.skin-site.admin.wiki.migration-hint',
		defaultMessage:
			'Migrated content lands in a hidden staging area and is published in one batch after every page is reviewed.',
	},
	autoTitle: {
		id: 'app.skin-site.admin.wiki.auto-title',
		defaultMessage: 'Read from MediaWiki API',
	},
	apiUrl: { id: 'app.skin-site.admin.wiki.api-url', defaultMessage: 'api.php URL' },
	botUsername: {
		id: 'app.skin-site.admin.wiki.bot-username',
		defaultMessage: 'Bot username (optional)',
	},
	botPassword: {
		id: 'app.skin-site.admin.wiki.bot-password',
		defaultMessage: 'Bot password (optional)',
	},
	credentialsHint: {
		id: 'app.skin-site.admin.wiki.credentials-hint',
		defaultMessage:
			'Credentials stay in memory for this job only. HTTPS is required when supplied.',
	},
	allowPrivate: {
		id: 'app.skin-site.admin.wiki.allow-private',
		defaultMessage: 'Allow private network source',
	},
	allowPrivateHint: {
		id: 'app.skin-site.admin.wiki.allow-private-hint',
		defaultMessage: 'Private sources may reach services inside the server network.',
	},
	startAuto: {
		id: 'app.skin-site.admin.wiki.start-auto',
		defaultMessage: 'Create automatic migration job',
	},
	xmlTitle: {
		id: 'app.skin-site.admin.wiki.xml-title',
		defaultMessage: 'Import MediaWiki XML',
	},
	xmlFile: { id: 'app.skin-site.admin.wiki.xml-file', defaultMessage: 'Export file' },
	startXml: {
		id: 'app.skin-site.admin.wiki.start-xml',
		defaultMessage: 'Upload and stage',
	},
	staleRules: {
		id: 'app.skin-site.admin.wiki.stale-rules',
		defaultMessage: 'Stale page detection rules',
	},
	staleDays: {
		id: 'app.skin-site.admin.wiki.stale-days',
		defaultMessage: 'Days without update',
	},
	maintainerWindow: {
		id: 'app.skin-site.admin.wiki.maintainer-window',
		defaultMessage: 'Maintainer window (days)',
	},
	maxMaintainers: {
		id: 'app.skin-site.admin.wiki.max-maintainers',
		defaultMessage: 'Max maintainers',
	},
	staleMarkers: {
		id: 'app.skin-site.admin.wiki.stale-markers',
		defaultMessage: 'Stale categories, templates or text',
	},
	staleMarkersHint: {
		id: 'app.skin-site.admin.wiki.stale-markers-hint',
		defaultMessage: 'Comma separated',
	},
	jobs: { id: 'app.skin-site.admin.wiki.jobs', defaultMessage: 'Migration jobs' },
	refreshJobs: {
		id: 'app.skin-site.admin.wiki.refresh-jobs',
		defaultMessage: 'Refresh',
	},
	jobsEmpty: {
		id: 'app.skin-site.admin.wiki.jobs-empty',
		defaultMessage: 'No migration jobs yet.',
	},
	reviewedCount: {
		id: 'app.skin-site.admin.wiki.reviewed-count',
		defaultMessage: 'Reviewed {reviewed} / {total}',
	},
	importedExcluded: {
		id: 'app.skin-site.admin.wiki.imported-excluded',
		defaultMessage: 'Imported {imported} · Excluded {excluded}',
	},
	viewJob: { id: 'app.skin-site.admin.wiki.view-job', defaultMessage: 'View job' },
	deleteJob: {
		id: 'app.skin-site.admin.wiki.delete-job',
		defaultMessage: 'Delete job record',
	},
	confirmDeleteJob: {
		id: 'app.skin-site.admin.wiki.confirm-delete-job',
		defaultMessage: 'Delete migration job #{id}? This cannot be undone.',
	},
	candidates: {
		id: 'app.skin-site.admin.wiki.candidates',
		defaultMessage: 'Candidate pages',
	},
	candidatesEmpty: {
		id: 'app.skin-site.admin.wiki.candidates-empty',
		defaultMessage: 'Select a job to review its pages.',
	},
	loadMore: { id: 'app.skin-site.admin.wiki.load-more', defaultMessage: 'Load more' },
	lastUpdated: {
		id: 'app.skin-site.admin.wiki.last-updated',
		defaultMessage: 'Updated {date}',
	},
	maintainerCount: {
		id: 'app.skin-site.admin.wiki.maintainer-count',
		defaultMessage: '{count} maintainers',
	},
	conflict: {
		id: 'app.skin-site.admin.wiki.conflict',
		defaultMessage: 'Title conflict',
	},
	targetTitle: {
		id: 'app.skin-site.admin.wiki.target-title',
		defaultMessage: 'Target title',
	},
	overwrite: {
		id: 'app.skin-site.admin.wiki.overwrite',
		defaultMessage: 'Overwrite',
	},
	importAction: { id: 'app.skin-site.admin.wiki.import', defaultMessage: 'Import' },
	excludeAction: { id: 'app.skin-site.admin.wiki.exclude', defaultMessage: 'Exclude' },
	publish: { id: 'app.skin-site.admin.wiki.publish', defaultMessage: 'Publish batch' },
	rollback: { id: 'app.skin-site.admin.wiki.rollback', defaultMessage: 'Roll back' },
	confirmRollback: {
		id: 'app.skin-site.admin.wiki.confirm-rollback',
		defaultMessage: 'Roll back this migration batch? Published pages will be reverted.',
	},
	stateImporting: {
		id: 'app.skin-site.admin.wiki.state-importing',
		defaultMessage: 'Importing',
	},
	stateReview: {
		id: 'app.skin-site.admin.wiki.state-review',
		defaultMessage: 'Waiting review',
	},
	statePublishing: {
		id: 'app.skin-site.admin.wiki.state-publishing',
		defaultMessage: 'Publishing',
	},
	statePublished: {
		id: 'app.skin-site.admin.wiki.state-published',
		defaultMessage: 'Published',
	},
	stateFailed: { id: 'app.skin-site.admin.wiki.state-failed', defaultMessage: 'Failed' },
	stateRolledBack: {
		id: 'app.skin-site.admin.wiki.state-rolled-back',
		defaultMessage: 'Rolled back',
	},
	decisionPending: {
		id: 'app.skin-site.admin.wiki.decision-pending',
		defaultMessage: 'Pending',
	},
	decisionImport: {
		id: 'app.skin-site.admin.wiki.decision-import',
		defaultMessage: 'Import',
	},
	decisionExclude: {
		id: 'app.skin-site.admin.wiki.decision-exclude',
		defaultMessage: 'Exclude',
	},
	migrationStarted: {
		id: 'app.skin-site.admin.wiki.migration-started',
		defaultMessage: 'Migration job created.',
	},
	xmlStaged: {
		id: 'app.skin-site.admin.wiki.xml-staged',
		defaultMessage: 'XML parsed and staged for review.',
	},
	published: {
		id: 'app.skin-site.admin.wiki.published',
		defaultMessage: 'Published {imported} pages, overwrote {overwritten}.',
	},
	rolledBack: {
		id: 'app.skin-site.admin.wiki.rolled-back',
		defaultMessage: 'Migration batch rolled back.',
	},
	jobDeleted: {
		id: 'app.skin-site.admin.wiki.job-deleted',
		defaultMessage: 'Migration record deleted.',
	},
	selectXml: {
		id: 'app.skin-site.admin.wiki.select-xml',
		defaultMessage: 'Choose a MediaWiki XML file first.',
	},
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

type Tab = 'page' | 'audit' | 'settings' | 'migration'
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
	if (next === 'migration' && !migrationJobs.value.length) await loadMigrationJobs()
}

// ---------- migration ----------
const migrationJobs = ref<SkinSiteWikiMigrationJobInfo[]>([])
const jobsLoading = ref(false)
const startingMigration = ref(false)

const automaticForm = ref({
	apiUrl: '',
	username: '',
	password: '',
	allowPrivateAddress: false,
	rules: {
		staleDays: 365,
		maintainerWindowDays: 180,
		maximumMaintainers: 1,
	},
})
const staleMarkersText = ref('')
const xmlInput = ref<HTMLInputElement | null>(null)

const selectedJob = ref<SkinSiteWikiMigrationJobInfo | null>(null)
const candidates = ref<SkinSiteWikiMigrationCandidate[]>([])
const candidatesLoading = ref(false)
const candidateNextCursor = ref<number | null>(null)
const candidateTargetTitles = reactive<Record<number, string>>({})
const candidateOverwrite = reactive<Record<number, boolean>>({})

const publishing = ref(false)
const rollingBack = ref(false)
const confirmingRollbackId = ref<number | null>(null)
const deletingJob = ref(false)
const confirmingDeleteId = ref<number | null>(null)

const JOB_STATE_LABELS: Record<string, string> = {
	IMPORTING: '正在读取',
	REVIEW: '等待审核',
	PUBLISHING: '正在发布',
	PUBLISHED: '已发布',
	FAILED: '失败',
	ROLLED_BACK: '已回滚',
}

function jobStateLabel(state: string): string {
	return JOB_STATE_LABELS[state] ?? state
}

function jobStateClass(state: string): string {
	switch (state) {
		case 'IMPORTING':
		case 'PUBLISHING':
			return 'bg-brand text-contrast'
		case 'REVIEW':
			return 'bg-yellow text-contrast'
		case 'PUBLISHED':
			return 'bg-green text-contrast'
		case 'FAILED':
			return 'bg-red text-contrast'
		default:
			return 'bg-button-bg text-secondary'
	}
}

function decisionLabel(decision: string): string {
	if (decision === 'IMPORT') return formatMessage(messages.decisionImport)
	if (decision === 'EXCLUDE') return formatMessage(messages.decisionExclude)
	return formatMessage(messages.decisionPending)
}

function decisionClass(decision: string): string {
	if (decision === 'IMPORT') return 'bg-green text-contrast'
	if (decision === 'EXCLUDE') return 'bg-red text-contrast'
	return 'bg-yellow text-contrast'
}

async function loadMigrationJobs() {
	jobsLoading.value = true
	try {
		const res = await skinSiteWikiMigrationJobs()
		if (!res.success) throw new Error(res.errorMessage)
		migrationJobs.value = res.payload ?? []
		if (selectedJob.value) {
			selectedJob.value = migrationJobs.value.find((j) => j.id === selectedJob.value!.id) ?? null
		}
	} catch (error) {
		handleError(error)
	} finally {
		jobsLoading.value = false
	}
}

async function startAutomaticMigration() {
	if (startingMigration.value) return
	startingMigration.value = true
	try {
		const res = await skinSiteWikiMigrationStartAutomatic({
			apiUrl: automaticForm.value.apiUrl.trim(),
			username: automaticForm.value.username.trim() || null,
			password: automaticForm.value.password || null,
			allowPrivateAddress: automaticForm.value.allowPrivateAddress,
			rules: {
				...automaticForm.value.rules,
				staleMarkers: staleMarkersText.value
					.split(/[,，]/)
					.map((s) => s.trim())
					.filter(Boolean),
			},
		})
		if (!res.success) throw new Error(res.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.migrationStarted) })
		await loadMigrationJobs()
	} catch (error) {
		handleError(error)
	} finally {
		startingMigration.value = false
	}
}

async function startXmlMigration() {
	const file = xmlInput.value?.files?.[0]
	if (!file) {
		addNotification({ type: 'error', title: formatMessage(messages.selectXml) })
		return
	}
	if (startingMigration.value) return
	startingMigration.value = true
	try {
		const res = await skinSiteWikiMigrationStartXml(file)
		if (!res.success) throw new Error(res.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.xmlStaged) })
		if (xmlInput.value) xmlInput.value.value = ''
		await loadMigrationJobs()
		await selectJob(res.payload)
	} catch (error) {
		handleError(error)
	} finally {
		startingMigration.value = false
	}
}

async function selectJob(job: SkinSiteWikiMigrationJobInfo) {
	confirmingDeleteId.value = null
	confirmingRollbackId.value = null
	selectedJob.value = job
	candidatesLoading.value = true
	try {
		const res = await skinSiteWikiMigrationCandidates(job.id)
		if (selectedJob.value?.id !== job.id) return
		if (!res.success) throw new Error(res.errorMessage)
		candidates.value = res.payload.items ?? []
		candidateNextCursor.value = res.payload.nextCursor ?? null
		applyCandidateDefaults(candidates.value)
	} catch (error) {
		handleError(error)
	} finally {
		if (selectedJob.value?.id === job.id) candidatesLoading.value = false
	}
}

function applyCandidateDefaults(items: SkinSiteWikiMigrationCandidate[]) {
	for (const c of items) {
		if (candidateTargetTitles[c.id] === undefined) candidateTargetTitles[c.id] = c.title
		if (candidateOverwrite[c.id] === undefined) candidateOverwrite[c.id] = false
	}
}

async function loadMoreCandidates() {
	if (!selectedJob.value || !candidateNextCursor.value || candidatesLoading.value) return
	const jobId = selectedJob.value.id
	candidatesLoading.value = true
	try {
		const res = await skinSiteWikiMigrationCandidates(jobId, candidateNextCursor.value)
		if (selectedJob.value?.id !== jobId) return
		if (!res.success) throw new Error(res.errorMessage)
		candidates.value.push(...(res.payload.items ?? []))
		candidateNextCursor.value = res.payload.nextCursor ?? null
		applyCandidateDefaults(res.payload.items ?? [])
	} catch (error) {
		handleError(error)
	} finally {
		if (selectedJob.value?.id === jobId) candidatesLoading.value = false
	}
}

async function decideCandidate(
	candidate: SkinSiteWikiMigrationCandidate,
	decision: 'IMPORT' | 'EXCLUDE',
) {
	try {
		const res = await skinSiteWikiMigrationDecide(candidate.id, {
			decision,
			targetTitle:
				decision === 'IMPORT' ? candidateTargetTitles[candidate.id] || candidate.title : null,
			overwrite: decision === 'IMPORT' ? Boolean(candidateOverwrite[candidate.id]) : false,
		})
		if (!res.success) throw new Error(res.errorMessage)
		candidate.decision = decision
		await loadMigrationJobs()
	} catch (error) {
		handleError(error)
	}
}

async function publishMigration() {
	if (!selectedJob.value || publishing.value) return
	publishing.value = true
	try {
		const res = await skinSiteWikiMigrationPublish(selectedJob.value.id)
		if (!res.success) throw new Error(res.errorMessage)
		addNotification({
			type: 'success',
			title: formatMessage(messages.published, {
				imported: res.payload.imported,
				overwritten: res.payload.overwritten,
			}),
		})
		await loadMigrationJobs()
	} catch (error) {
		handleError(error)
	} finally {
		publishing.value = false
	}
}

async function rollbackMigration() {
	if (!selectedJob.value || rollingBack.value) return
	rollingBack.value = true
	try {
		const res = await skinSiteWikiMigrationRollback(selectedJob.value.id)
		if (!res.success) throw new Error(res.errorMessage)
		confirmingRollbackId.value = null
		addNotification({ type: 'success', title: formatMessage(messages.rolledBack) })
		await loadMigrationJobs()
	} catch (error) {
		handleError(error)
	} finally {
		rollingBack.value = false
	}
}

async function deleteJob(job: SkinSiteWikiMigrationJobInfo) {
	if (deletingJob.value || confirmingDeleteId.value !== job.id) return
	if (job.state !== 'FAILED' && job.state !== 'ROLLED_BACK') return
	deletingJob.value = true
	try {
		const res = await skinSiteWikiMigrationDelete(job.id)
		if (!res.success) throw new Error(res.errorMessage)
		migrationJobs.value = migrationJobs.value.filter((j) => j.id !== job.id)
		if (selectedJob.value?.id === job.id) {
			selectedJob.value = null
			candidates.value = []
			candidateNextCursor.value = null
		}
		confirmingDeleteId.value = null
		addNotification({ type: 'success', title: formatMessage(messages.jobDeleted) })
		await loadMigrationJobs()
	} catch (error) {
		handleError(error)
	} finally {
		deletingJob.value = false
	}
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
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold"
				:class="tab === 'migration' ? 'bg-brand text-contrast' : 'bg-button-bg text-secondary'"
				@click="switchTab('migration')"
			>
				{{ formatMessage(messages.tabMigration) }}
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
							<option value="PUBLIC">{{ formatMessage(messages.policyPublic) }}</option>
							<option value="MEMBER">{{ formatMessage(messages.policyMember) }}</option>
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
							<option value="MEMBER">{{ formatMessage(messages.policyMember) }}</option>
							<option value="WEB_ADMIN">{{ formatMessage(messages.policyAdmin) }}</option>
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
		<template v-else-if="tab === 'settings'">
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
		<template v-else>
			<div class="flex flex-col gap-4">
				<div class="rounded-xl border border-solid border-surface-5 bg-bg-raised p-4">
					<h3 class="m-0 text-base font-bold text-contrast">
						{{ formatMessage(messages.migrationTitle) }}
					</h3>
					<p class="m-0 mt-1 text-xs text-secondary">
						{{ formatMessage(messages.migrationHint) }}
					</p>
				</div>

				<div class="flex flex-col gap-3 rounded-xl border border-solid border-surface-5 p-4">
					<h4 class="m-0 text-sm font-bold text-contrast">
						{{ formatMessage(messages.autoTitle) }}
					</h4>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-secondary">
							{{ formatMessage(messages.apiUrl) }}
						</span>
						<input
							v-model.trim="automaticForm.apiUrl"
							type="url"
							placeholder="https://example.com/w/api.php"
							class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						/>
					</label>
					<div class="grid gap-2 sm:grid-cols-2">
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-secondary">
								{{ formatMessage(messages.botUsername) }}
							</span>
							<input
								v-model.trim="automaticForm.username"
								type="text"
								class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-secondary">
								{{ formatMessage(messages.botPassword) }}
							</span>
							<input
								v-model="automaticForm.password"
								type="password"
								class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
							/>
						</label>
					</div>
					<p class="m-0 text-[11px] text-secondary">
						{{ formatMessage(messages.credentialsHint) }}
					</p>
					<label class="flex cursor-pointer items-center gap-2 text-xs text-contrast">
						<input v-model="automaticForm.allowPrivateAddress" type="checkbox" class="size-3.5" />
						{{ formatMessage(messages.allowPrivate) }}
					</label>
					<p v-if="automaticForm.allowPrivateAddress" class="m-0 text-[11px] text-yellow">
						{{ formatMessage(messages.allowPrivateHint) }}
					</p>
					<details class="rounded-lg border border-solid border-surface-5 p-3">
						<summary class="cursor-pointer text-xs font-semibold text-contrast">
							{{ formatMessage(messages.staleRules) }}
						</summary>
						<div class="mt-3 grid gap-2 sm:grid-cols-3">
							<label class="flex flex-col gap-1">
								<span class="text-[11px] text-secondary">{{
									formatMessage(messages.staleDays)
								}}</span>
								<input
									v-model.number="automaticForm.rules.staleDays"
									type="number"
									min="1"
									max="36500"
									class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast"
								/>
							</label>
							<label class="flex flex-col gap-1">
								<span class="text-[11px] text-secondary">{{
									formatMessage(messages.maintainerWindow)
								}}</span>
								<input
									v-model.number="automaticForm.rules.maintainerWindowDays"
									type="number"
									min="1"
									max="36500"
									class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast"
								/>
							</label>
							<label class="flex flex-col gap-1">
								<span class="text-[11px] text-secondary">{{
									formatMessage(messages.maxMaintainers)
								}}</span>
								<input
									v-model.number="automaticForm.rules.maximumMaintainers"
									type="number"
									min="0"
									max="100"
									class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast"
								/>
							</label>
							<label class="flex flex-col gap-1 sm:col-span-3">
								<span class="text-[11px] text-secondary">{{
									formatMessage(messages.staleMarkers)
								}}</span>
								<input
									v-model="staleMarkersText"
									type="text"
									:placeholder="formatMessage(messages.staleMarkersHint)"
									class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast"
								/>
							</label>
						</div>
					</details>
					<button
						type="button"
						class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="startingMigration"
						@click="startAutomaticMigration"
					>
						{{ formatMessage(messages.startAuto) }}
					</button>
				</div>

				<div class="flex flex-col gap-3 rounded-xl border border-solid border-surface-5 p-4">
					<h4 class="m-0 text-sm font-bold text-contrast">
						{{ formatMessage(messages.xmlTitle) }}
					</h4>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-secondary">
							{{ formatMessage(messages.xmlFile) }}
						</span>
						<input
							ref="xmlInput"
							type="file"
							accept=".xml,text/xml,application/xml"
							class="text-xs text-contrast"
						/>
					</label>
					<button
						type="button"
						class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="startingMigration"
						@click="startXmlMigration"
					>
						{{ formatMessage(messages.startXml) }}
					</button>
				</div>

				<div class="flex flex-col gap-3 rounded-xl border border-solid border-surface-5 p-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h4 class="m-0 text-sm font-bold text-contrast">
							{{ formatMessage(messages.jobs) }}
						</h4>
						<button
							type="button"
							class="rounded-lg bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
							:disabled="jobsLoading"
							@click="loadMigrationJobs"
						>
							{{ formatMessage(messages.refreshJobs) }}
						</button>
					</div>

					<div
						v-if="jobsLoading"
						class="flex min-h-24 items-center justify-center gap-2 text-sm text-secondary"
					>
						<SpinnerIcon class="size-4 animate-spin" />
						{{ formatMessage(messages.loading) }}
					</div>
					<p
						v-else-if="!migrationJobs.length"
						class="m-0 rounded-lg bg-bg-raised p-3 text-xs text-secondary"
					>
						{{ formatMessage(messages.jobsEmpty) }}
					</p>
					<div v-else class="flex flex-col gap-2">
						<article
							v-for="job in migrationJobs"
							:key="job.id"
							class="rounded-lg border border-solid p-3"
							:class="selectedJob?.id === job.id ? 'border-brand bg-brand/5' : 'border-surface-5'"
						>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<span class="text-sm font-semibold text-contrast"
									>#{{ job.id }} · {{ job.source }}</span
								>
								<span
									class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
									:class="jobStateClass(job.state)"
								>
									{{ jobStateLabel(job.state) }}
								</span>
							</div>
							<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-button-bg">
								<div
									class="h-full bg-brand transition-all"
									:style="{ width: (job.total ? (job.reviewed / job.total) * 100 : 0) + '%' }"
								></div>
							</div>
							<div class="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-secondary">
								<span>{{
									formatMessage(messages.reviewedCount, {
										reviewed: job.reviewed,
										total: job.total,
									})
								}}</span>
								<span>{{
									formatMessage(messages.importedExcluded, {
										imported: job.imported,
										excluded: job.excluded,
									})
								}}</span>
							</div>
							<p v-if="job.error" class="m-0 mt-2 text-xs text-red">{{ job.error }}</p>
							<div class="mt-2 flex flex-wrap justify-end gap-2">
								<button
									type="button"
									class="rounded-lg bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
									@click="selectJob(job)"
								>
									{{ formatMessage(messages.viewJob) }}
								</button>
								<button
									v-if="job.state === 'FAILED' || job.state === 'ROLLED_BACK'"
									type="button"
									class="rounded-lg bg-red/20 px-3 py-1 text-xs font-semibold text-red hover:brightness-110 disabled:opacity-50"
									:disabled="deletingJob"
									@click="confirmingDeleteId = job.id"
								>
									{{ formatMessage(messages.deleteJob) }}
								</button>
							</div>
							<div v-if="confirmingDeleteId === job.id" class="mt-2 rounded-lg bg-red/10 p-2">
								<p class="m-0 text-xs text-red">
									{{ formatMessage(messages.confirmDeleteJob, { id: job.id }) }}
								</p>
								<div class="mt-2 flex justify-end gap-2">
									<button
										type="button"
										class="rounded-lg bg-button-bg px-3 py-1 text-xs font-semibold text-secondary"
										@click="confirmingDeleteId = null"
									>
										{{ formatMessage(messages.cancel) }}
									</button>
									<button
										type="button"
										class="rounded-lg bg-red px-3 py-1 text-xs font-semibold text-contrast disabled:opacity-50"
										:disabled="deletingJob"
										@click="deleteJob(job)"
									>
										{{ formatMessage(messages.deleteJob) }}
									</button>
								</div>
							</div>
						</article>
					</div>
				</div>

				<div
					v-if="selectedJob"
					class="flex flex-col gap-3 rounded-xl border border-solid border-surface-5 p-4"
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h4 class="m-0 text-sm font-bold text-contrast">
							{{ formatMessage(messages.candidates) }}
						</h4>
						<div class="flex flex-wrap gap-2">
							<button
								v-if="selectedJob.state === 'REVIEW'"
								type="button"
								class="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
								:disabled="publishing"
								@click="publishMigration"
							>
								{{ formatMessage(messages.publish) }}
							</button>
							<button
								v-if="selectedJob.state === 'PUBLISHED'"
								type="button"
								class="rounded-lg bg-yellow/20 px-3 py-1 text-xs font-semibold text-yellow hover:brightness-110 disabled:opacity-50"
								:disabled="rollingBack"
								@click="confirmingRollbackId = selectedJob.id"
							>
								{{ formatMessage(messages.rollback) }}
							</button>
						</div>
					</div>
					<div v-if="confirmingRollbackId === selectedJob.id" class="rounded-lg bg-yellow/10 p-2">
						<p class="m-0 text-xs text-yellow">{{ formatMessage(messages.confirmRollback) }}</p>
						<div class="mt-2 flex justify-end gap-2">
							<button
								type="button"
								class="rounded-lg bg-button-bg px-3 py-1 text-xs font-semibold text-secondary"
								@click="confirmingRollbackId = null"
							>
								{{ formatMessage(messages.cancel) }}
							</button>
							<button
								type="button"
								class="rounded-lg bg-yellow px-3 py-1 text-xs font-semibold text-contrast disabled:opacity-50"
								:disabled="rollingBack"
								@click="rollbackMigration"
							>
								{{ formatMessage(messages.rollback) }}
							</button>
						</div>
					</div>

					<div
						v-if="candidatesLoading && !candidates.length"
						class="flex min-h-24 items-center justify-center gap-2 text-sm text-secondary"
					>
						<SpinnerIcon class="size-4 animate-spin" />
						{{ formatMessage(messages.loading) }}
					</div>
					<p
						v-else-if="!candidates.length"
						class="m-0 rounded-lg bg-bg-raised p-3 text-xs text-secondary"
					>
						{{ formatMessage(messages.candidatesEmpty) }}
					</p>
					<div v-else class="flex flex-col gap-2">
						<div
							v-for="candidate in candidates"
							:key="candidate.id"
							class="flex flex-col gap-2 rounded-lg border border-solid border-surface-5 p-3"
						>
							<div class="flex flex-wrap items-center gap-2">
								<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">{{
									candidate.title
								}}</span>
								<span
									class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
									:class="decisionClass(candidate.decision)"
								>
									{{ decisionLabel(candidate.decision) }}
								</span>
								<span
									v-if="candidate.conflict"
									class="rounded-full bg-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-yellow"
								>
									{{ formatMessage(messages.conflict) }}
								</span>
							</div>
							<div class="flex flex-wrap gap-3 text-[11px] text-secondary">
								<span>{{
									formatMessage(messages.lastUpdated, {
										date: new Date(candidate.lastUpdatedAt).toLocaleDateString(),
									})
								}}</span>
								<span>{{
									formatMessage(messages.maintainerCount, { count: candidate.maintainerCount })
								}}</span>
							</div>
							<div v-if="candidate.suspiciousReasons.length" class="flex flex-wrap gap-1">
								<span
									v-for="reason in candidate.suspiciousReasons"
									:key="reason"
									class="rounded bg-bg px-1.5 py-0.5 text-[10px] text-secondary"
								>
									{{ reason }}
								</span>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<input
									v-model="candidateTargetTitles[candidate.id]"
									type="text"
									:placeholder="formatMessage(messages.targetTitle)"
									class="min-w-0 flex-1 rounded-lg border border-solid border-surface-5 bg-bg-raised px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
								/>
								<label class="flex cursor-pointer items-center gap-1.5 text-[11px] text-contrast">
									<input
										v-model="candidateOverwrite[candidate.id]"
										type="checkbox"
										class="size-3"
									/>
									{{ formatMessage(messages.overwrite) }}
								</label>
								<button
									type="button"
									class="rounded-lg bg-green/20 px-3 py-1 text-xs font-semibold text-green hover:brightness-110"
									@click="decideCandidate(candidate, 'IMPORT')"
								>
									{{ formatMessage(messages.importAction) }}
								</button>
								<button
									type="button"
									class="rounded-lg bg-red/20 px-3 py-1 text-xs font-semibold text-red hover:brightness-110"
									@click="decideCandidate(candidate, 'EXCLUDE')"
								>
									{{ formatMessage(messages.excludeAction) }}
								</button>
							</div>
						</div>
						<button
							v-if="candidateNextCursor"
							type="button"
							class="rounded-lg bg-button-bg px-4 py-2 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
							:disabled="candidatesLoading"
							@click="loadMoreCandidates"
						>
							{{ formatMessage(messages.loadMore) }}
						</button>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>
