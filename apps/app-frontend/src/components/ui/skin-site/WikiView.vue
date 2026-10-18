<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	type SkinSiteWikiPageDetail,
	skinSiteWikiPage,
} from '@/helpers/skin-site-api'

import WikiNodeRenderer from './wiki/WikiNodeRenderer.vue'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const props = withDefaults(defineProps<{ initialTitle?: string }>(), {
	initialTitle: '',
})

const messages = defineMessages({
	title: { id: 'app.skin-site.wiki.title', defaultMessage: 'StarLight Wiki' },
	searchPlaceholder: {
		id: 'app.skin-site.wiki.search-placeholder',
		defaultMessage: 'Enter a page title',
	},
	open: { id: 'app.skin-site.wiki.open', defaultMessage: 'Open' },
	loading: { id: 'app.skin-site.wiki.loading', defaultMessage: 'Loading…' },
	notFound: {
		id: 'app.skin-site.wiki.not-found',
		defaultMessage: 'Page not found.',
	},
	empty: {
		id: 'app.skin-site.wiki.empty',
		defaultMessage: 'Enter a page title above to start reading.',
	},
	updatedAt: {
		id: 'app.skin-site.wiki.updated-at',
		defaultMessage: 'Last edited {date} by {author}',
	},
	revision: { id: 'app.skin-site.wiki.revision', defaultMessage: 'Revision #{id}' },
	categories: { id: 'app.skin-site.wiki.categories', defaultMessage: 'Categories' },
	back: { id: 'app.skin-site.wiki.back', defaultMessage: 'Back' },
})

const titleInput = ref(props.initialTitle)
const page = ref<SkinSiteWikiPageDetail | null>(null)
const loading = ref(false)
const notFound = ref(false)
const history = ref<string[]>([])

const currentTitle = computed(() => page.value?.title ?? '')

async function openPage(title: string) {
	const trimmed = title.trim()
	if (!trimmed) return
	titleInput.value = trimmed
	loading.value = true
	notFound.value = false
	try {
		const res = await skinSiteWikiPage(trimmed)
		if (!res.success) {
			notFound.value = true
			page.value = null
			return
		}
		page.value = res.payload
		if (currentTitle.value && history.value[history.value.length - 1] !== currentTitle.value) {
			history.value.push(currentTitle.value)
		}
	} catch (error) {
		handleError(error)
		notFound.value = true
		page.value = null
	} finally {
		loading.value = false
	}
}

function goBack() {
	const prev = history.value.pop()
	if (prev) void openPage(prev)
}

function formatDate(ts: number): string {
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return '—'
	}
}

function onNavigate(title: string) {
	if (title) void openPage(title)
}

onMounted(() => {
	if (props.initialTitle) void openPage(props.initialTitle)
})
</script>

<template>
	<div class="flex w-full flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<button
				v-if="history.length"
				type="button"
				class="rounded-lg bg-button-bg px-3 py-1.5 text-xs font-semibold text-contrast hover:brightness-110"
				@click="goBack"
			>
				← {{ formatMessage(messages.back) }}
			</button>
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<input
				v-model="titleInput"
				type="text"
				:placeholder="formatMessage(messages.searchPlaceholder)"
				class="min-w-0 flex-1 rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-1.5 text-xs text-contrast outline-none focus:border-brand"
				@keyup.enter="openPage(titleInput)"
			/>
			<button
				type="button"
				class="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-contrast hover:brightness-110"
				@click="openPage(titleInput)"
			>
				{{ formatMessage(messages.open) }}
			</button>
		</div>

		<div v-if="loading" class="flex min-h-48 items-center justify-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p
			v-else-if="notFound"
			class="m-0 rounded-lg border border-solid border-surface-5 bg-bg-raised p-4 text-sm text-secondary"
		>
			{{ formatMessage(messages.notFound) }}
		</p>
		<p
			v-else-if="!page"
			class="m-0 rounded-lg border border-solid border-surface-5 bg-bg-raised p-4 text-sm text-secondary"
		>
			{{ formatMessage(messages.empty) }}
		</p>
		<template v-else>
			<div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-solid border-surface-5 pb-2">
				<h1 class="m-0 text-2xl font-bold text-contrast">{{ page.title }}</h1>
				<span class="text-[11px] text-secondary">
					{{ formatMessage(messages.revision, { id: page.revisionId }) }}
				</span>
			</div>

			<p class="m-0 text-[11px] text-secondary">
				{{
					formatMessage(messages.updatedAt, {
						date: formatDate(page.updatedAt),
						author: page.authorName,
					})
				}}
			</p>

			<div
				v-if="page.redirectTarget"
				class="rounded-lg border border-solid border-yellow/40 bg-yellow/10 p-3 text-xs text-yellow"
			>
				重定向到
				<button
					type="button"
					class="font-semibold underline underline-offset-2"
					@click="openPage(page.redirectTarget ?? '')"
				>
					{{ page.redirectTarget }}
				</button>
			</div>

			<article class="min-w-0 text-sm leading-7 text-contrast">
				<WikiNodeRenderer :nodes="page.nodes" @navigate="onNavigate" />
			</article>

			<div v-if="page.categories.length" class="flex flex-wrap items-center gap-2 pt-2">
				<span class="text-[11px] text-secondary">{{ formatMessage(messages.categories) }}:</span>
				<span
					v-for="category in page.categories"
					:key="category"
					class="rounded bg-bg-raised px-2 py-0.5 text-[11px] text-secondary"
				>
					{{ category }}
				</span>
			</div>
		</template>
	</div>
</template>
