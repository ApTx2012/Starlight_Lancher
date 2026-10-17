<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	skinSiteDecideReviewSubmission,
	skinSiteRegenerateReviewInvite,
	type SkinSiteReviewResult,
	type SkinSiteReviewSubmission,
	skinSiteReviewSubmissionCount,
	skinSiteReviewSubmissions,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.review.title', defaultMessage: 'Player review' },
	loading: { id: 'app.skin-site.admin.review.loading', defaultMessage: 'Loading…' },
	failed: {
		id: 'app.skin-site.admin.review.failed',
		defaultMessage: 'Could not load submissions.',
	},
	empty: { id: 'app.skin-site.admin.review.empty', defaultMessage: 'No submissions found.' },
	total: { id: 'app.skin-site.admin.review.total', defaultMessage: '{count} submissions' },
	filterAll: { id: 'app.skin-site.admin.review.filter-all', defaultMessage: 'All' },
	filterPending: { id: 'app.skin-site.admin.review.filter-pending', defaultMessage: 'Pending' },
	filterPassed: { id: 'app.skin-site.admin.review.filter-passed', defaultMessage: 'Passed' },
	filterRejected: { id: 'app.skin-site.admin.review.filter-rejected', defaultMessage: 'Rejected' },
	resultPending: { id: 'app.skin-site.admin.review.result-pending', defaultMessage: 'Pending' },
	resultPassed: { id: 'app.skin-site.admin.review.result-passed', defaultMessage: 'Passed' },
	resultRejected: { id: 'app.skin-site.admin.review.result-rejected', defaultMessage: 'Rejected' },
	modeAuto: { id: 'app.skin-site.admin.review.mode-auto', defaultMessage: 'Auto' },
	modeManual: { id: 'app.skin-site.admin.review.mode-manual', defaultMessage: 'Manual' },
	applicant: { id: 'app.skin-site.admin.review.applicant', defaultMessage: 'Applicant' },
	submittedAt: { id: 'app.skin-site.admin.review.submitted-at', defaultMessage: 'Submitted' },
	score: { id: 'app.skin-site.admin.review.score', defaultMessage: 'Score' },
	reviewer: { id: 'app.skin-site.admin.review.reviewer', defaultMessage: 'Reviewer' },
	details: { id: 'app.skin-site.admin.review.details', defaultMessage: 'Details' },
	hide: { id: 'app.skin-site.admin.review.hide', defaultMessage: 'Hide' },
	answers: { id: 'app.skin-site.admin.review.answers', defaultMessage: 'Answers' },
	noAnswers: { id: 'app.skin-site.admin.review.no-answers', defaultMessage: 'No answers.' },
	autoChecks: { id: 'app.skin-site.admin.review.auto-checks', defaultMessage: 'Automatic checks' },
	context: { id: 'app.skin-site.admin.review.context', defaultMessage: 'Submission context' },
	ip: { id: 'app.skin-site.admin.review.ip', defaultMessage: 'IP' },
	userAgent: { id: 'app.skin-site.admin.review.user-agent', defaultMessage: 'User agent' },
	activity: { id: 'app.skin-site.admin.review.activity', defaultMessage: 'Activity' },
	duration: { id: 'app.skin-site.admin.review.duration', defaultMessage: 'Duration' },
	hiddenTime: { id: 'app.skin-site.admin.review.hidden-time', defaultMessage: 'Hidden time' },
	screenSwitches: {
		id: 'app.skin-site.admin.review.screen-switches',
		defaultMessage: 'Screen switches',
	},
	history: { id: 'app.skin-site.admin.review.history', defaultMessage: 'Decision history' },
	accept: { id: 'app.skin-site.admin.review.accept', defaultMessage: 'Accept' },
	reject: { id: 'app.skin-site.admin.review.reject', defaultMessage: 'Reject' },
	reason: { id: 'app.skin-site.admin.review.reason', defaultMessage: 'Reason' },
	acceptDone: {
		id: 'app.skin-site.admin.review.accept-done',
		defaultMessage: 'Submission accepted.',
	},
	rejectDone: {
		id: 'app.skin-site.admin.review.reject-done',
		defaultMessage: 'Submission rejected.',
	},
	regenInvite: {
		id: 'app.skin-site.admin.review.regen-invite',
		defaultMessage: 'Regenerate invite',
	},
	inviteRegenerated: {
		id: 'app.skin-site.admin.review.invite-regenerated',
		defaultMessage: 'Invite code regenerated.',
	},
	inviteSent: {
		id: 'app.skin-site.admin.review.invite-sent',
		defaultMessage: 'Email sent.',
	},
	inviteNotSent: {
		id: 'app.skin-site.admin.review.invite-not-sent',
		defaultMessage: 'Email not sent.',
	},
	prev: { id: 'app.skin-site.admin.review.prev', defaultMessage: 'Previous' },
	next: { id: 'app.skin-site.admin.review.next', defaultMessage: 'Next' },
	page: { id: 'app.skin-site.admin.review.page', defaultMessage: 'Page {page}' },
})

const PAGE_SIZE = 20

const items = ref<SkinSiteReviewSubmission[]>([])
const total = ref(0)
const offset = ref(0)
const loading = ref(true)
const failed = ref(false)

const filter = ref<'' | SkinSiteReviewResult | 'COMPLETED'>('PENDING')

const expandedId = ref<number | null>(null)
const decisions = ref<Record<number, { reason: string; working: boolean }>>({})

const page = computed(() => Math.floor(offset.value / PAGE_SIZE) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const hasPrev = computed(() => offset.value > 0)
const hasNext = computed(() => offset.value + PAGE_SIZE < total.value)

const FILTERS: Array<{ key: '' | SkinSiteReviewResult | 'COMPLETED'; label: () => string }> = [
	{ key: '', label: () => formatMessage(messages.filterAll) },
	{ key: 'PENDING', label: () => formatMessage(messages.filterPending) },
	{ key: 'PASSED', label: () => formatMessage(messages.filterPassed) },
	{ key: 'REJECTED', label: () => formatMessage(messages.filterRejected) },
]

function resultLabel(result: SkinSiteReviewResult): string {
	if (result === 'PASSED') return formatMessage(messages.resultPassed)
	if (result === 'REJECTED') return formatMessage(messages.resultRejected)
	return formatMessage(messages.resultPending)
}

function resultClass(result: SkinSiteReviewResult): string {
	if (result === 'PASSED') return 'bg-green text-contrast'
	if (result === 'REJECTED') return 'bg-red text-contrast'
	return 'bg-button-bg text-secondary'
}

function modeLabel(mode: string): string {
	return mode === 'AUTO' ? formatMessage(messages.modeAuto) : formatMessage(messages.modeManual)
}

function formatDateTime(ts?: number | null): string {
	if (!ts) return ''
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ''
	}
}

function formatDuration(ms?: number | null): string {
	if (!ms || ms < 0) return '—'
	const totalSeconds = Math.floor(ms / 1000)
	const m = Math.floor(totalSeconds / 60)
	const s = totalSeconds % 60
	return m > 0 ? m + 'm ' + s + 's' : s + 's'
}

function decisionFor(id: number) {
	if (!decisions.value[id]) decisions.value[id] = { reason: '', working: false }
	return decisions.value[id]
}

async function load(reset = false) {
	if (reset) offset.value = 0
	loading.value = true
	failed.value = false
	try {
		const resultFilter = filter.value || undefined
		const listResult = await skinSiteReviewSubmissions({
			result: resultFilter,
			limit: PAGE_SIZE,
			offset: offset.value,
		})
		if (!listResult.success) throw new Error(listResult.errorMessage)
		items.value = listResult.payload ?? []
		const countResult = await skinSiteReviewSubmissionCount({ result: resultFilter })
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

async function setFilter(key: '' | SkinSiteReviewResult | 'COMPLETED') {
	filter.value = key
	await load(true)
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

function toggleDetails(id: number) {
	expandedId.value = expandedId.value === id ? null : id
}

async function decide(submission: SkinSiteReviewSubmission, accepted: boolean) {
	const state = decisionFor(submission.id)
	if (state.working) return
	state.working = true
	try {
		const result = await skinSiteDecideReviewSubmission(
			submission.id,
			accepted,
			{},
			submission.revision,
			state.reason,
		)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({
			type: 'success',
			title: formatMessage(accepted ? messages.acceptDone : messages.rejectDone),
		})
		expandedId.value = null
		await load()
	} catch (error) {
		handleError(error)
	} finally {
		state.working = false
	}
}

async function regenerateInvite(submission: SkinSiteReviewSubmission) {
	try {
		const result = await skinSiteRegenerateReviewInvite(submission.id)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({
			type: 'success',
			title: formatMessage(result.payload.emailSent ? messages.inviteSent : messages.inviteNotSent),
		})
		await load()
	} catch (error) {
		handleError(error)
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
			<button
				v-for="f in FILTERS"
				:key="f.key || 'all'"
				type="button"
				class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
				:class="
					filter === f.key
						? 'bg-brand text-contrast'
						: 'bg-button-bg text-secondary hover:text-contrast'
				"
				@click="setFilter(f.key)"
			>
				{{ f.label() }}
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
				v-for="submission in items"
				:key="submission.id"
				class="flex flex-col gap-2 rounded-xl bg-bg-raised p-3"
			>
				<div class="flex flex-wrap items-center gap-2">
					<span class="shrink-0 text-xs text-secondary">#{{ submission.id }}</span>
					<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
						{{ submission.applicantName }}
					</span>
					<span
						class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
						:class="resultClass(submission.result)"
					>
						{{ resultLabel(submission.result) }}
					</span>
					<span
						class="shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-[10px] font-semibold text-secondary"
					>
						{{ modeLabel(submission.mode) }}
					</span>
					<span
						v-if="submission.score !== null && submission.score !== undefined"
						class="shrink-0 text-xs font-semibold text-contrast"
					>
						{{ submission.score }}
					</span>
					<span class="shrink-0 text-xs text-secondary">
						{{ formatDateTime(submission.createdAt) }}
					</span>
					<button
						type="button"
						class="shrink-0 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="toggleDetails(submission.id)"
					>
						{{
							expandedId === submission.id
								? formatMessage(messages.hide)
								: formatMessage(messages.details)
						}}
					</button>
				</div>

				<div
					v-if="expandedId === submission.id"
					class="flex flex-col gap-3 border-t border-solid border-surface-5 pt-3"
				>
					<div
						v-if="submission.context"
						class="flex flex-col gap-1 rounded-lg bg-bg p-3 text-xs text-secondary"
					>
						<span class="font-semibold text-contrast">
							{{ formatMessage(messages.context) }}
						</span>
						<span>{{ formatMessage(messages.ip) }}: {{ submission.context.ip ?? '—' }}</span>
						<span class="break-all">
							{{ formatMessage(messages.userAgent) }}: {{ submission.context.userAgent }}
						</span>
						<span v-if="submission.context.activity">
							{{ formatMessage(messages.duration) }}:
							{{ formatDuration(submission.context.activity.durationMs) }} ·
							{{ formatMessage(messages.hiddenTime) }}:
							{{ formatDuration(submission.context.activity.hiddenMs) }} ·
							{{ formatMessage(messages.screenSwitches) }}:
							{{ submission.context.activity.screenSwitches }}
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.answers) }}
						</span>
						<p
							v-if="!submission.answers || !submission.answers.length"
							class="m-0 text-xs text-secondary"
						>
							{{ formatMessage(messages.noAnswers) }}
						</p>
						<div v-else class="flex flex-col gap-1.5">
							<div
								v-for="(answer, idx) in submission.answers"
								:key="answer.id || idx"
								class="rounded-lg bg-bg p-2 text-xs text-secondary"
							>
								<span class="text-contrast">
									{{ answer.text ?? (answer.values ? answer.values.join(', ') : '—') }}
								</span>
								<span v-if="answer.score !== null && answer.score !== undefined">
									· {{ formatMessage(messages.score) }}: {{ answer.score }}
								</span>
							</div>
						</div>
					</div>

					<div
						v-if="Object.keys(submission.automaticResults || {}).length"
						class="flex flex-col gap-1"
					>
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.autoChecks) }}
						</span>
						<div class="flex flex-wrap gap-2">
							<span
								v-for="(passed, key) in submission.automaticResults"
								:key="key"
								class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
								:class="passed ? 'bg-green text-contrast' : 'bg-red text-contrast'"
							>
								{{ key }}: {{ passed ? '✓' : '✗' }}
							</span>
						</div>
					</div>

					<div
						v-if="submission.decisionHistory && submission.decisionHistory.length"
						class="flex flex-col gap-1"
					>
						<span class="text-xs font-semibold text-contrast">
							{{ formatMessage(messages.history) }}
						</span>
						<div
							v-for="(h, idx) in submission.decisionHistory"
							:key="idx"
							class="rounded-lg bg-bg p-2 text-xs text-secondary"
						>
							{{ h.reviewer }} · {{ resultLabel(h.result) }} ·
							{{ formatDateTime(h.at) }}
							<span v-if="h.reason"> · {{ h.reason }}</span>
						</div>
					</div>

					<div class="flex flex-col gap-2">
						<input
							v-model="decisionFor(submission.id).reason"
							type="text"
							:placeholder="formatMessage(messages.reason)"
							class="rounded-lg border border-solid border-surface-5 bg-bg px-3 py-1.5 text-sm text-contrast outline-none focus:border-brand"
						/>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class="rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
								:disabled="decisionFor(submission.id).working || submission.result === 'PASSED'"
								@click="decide(submission, true)"
							>
								{{ formatMessage(messages.accept) }}
							</button>
							<button
								type="button"
								class="rounded-full bg-red px-4 py-1.5 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
								:disabled="decisionFor(submission.id).working || submission.result === 'REJECTED'"
								@click="decide(submission, false)"
							>
								{{ formatMessage(messages.reject) }}
							</button>
							<button
								type="button"
								class="rounded-full bg-button-bg px-4 py-1.5 text-xs font-semibold text-secondary hover:brightness-110"
								@click="regenerateInvite(submission)"
							>
								{{ formatMessage(messages.regenInvite) }}
							</button>
						</div>
					</div>
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
