<script setup lang="ts">
import { NewspaperIcon, SpinnerIcon, StarIcon } from '@modrinth/assets'
import { commonMessages, defineMessages, useVIntl } from '@modrinth/ui'
import { onUnmounted, ref, watch } from 'vue'

import {
	reloadSkinSiteSession,
	skinSiteStatus,
	skinSiteUser,
} from '@/composables/skin-site-session'
import { type SkinSiteAnnouncement, skinSiteAnnouncements } from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: { id: 'app.skin-site.home.announcements.title', defaultMessage: 'Announcements' },
	empty: {
		id: 'app.skin-site.home.announcements.empty',
		defaultMessage: 'No announcements right now.',
	},
	loading: { id: 'app.skin-site.home.announcements.loading', defaultMessage: 'Loading…' },
	failed: {
		id: 'app.skin-site.home.announcements.failed',
		defaultMessage: 'Could not load announcements.',
	},
	signedOut: {
		id: 'app.skin-site.home.announcements.signed-out',
		defaultMessage: 'Sign in to view announcements.',
	},
})

const announcements = ref<SkinSiteAnnouncement[]>([])
const loading = ref(true)
const failed = ref(false)
let requestId = 0

function formatDate(ts: number): string {
	try {
		return new Date(ts).toLocaleDateString()
	} catch {
		return ''
	}
}

async function load() {
	const currentRequest = ++requestId
	announcements.value = []
	failed.value = skinSiteStatus.value === 'error'
	loading.value = skinSiteStatus.value === 'checking'
	if (skinSiteStatus.value !== 'signed-in') return
	loading.value = true
	try {
		const result = await skinSiteAnnouncements()
		if (currentRequest !== requestId) return
		if (result.success) {
			announcements.value = [...(result.payload ?? [])]
				.sort((a, b) => {
					if (a.star !== b.star) return a.star ? -1 : 1
					return b.updateAt - a.updateAt
				})
				.slice(0, 5)
		} else {
			failed.value = true
		}
	} catch {
		if (currentRequest === requestId) failed.value = true
	} finally {
		if (currentRequest === requestId) loading.value = false
	}
}

async function retry() {
	if (skinSiteStatus.value === 'error') await reloadSkinSiteSession()
	else await load()
}

watch([skinSiteStatus, () => skinSiteUser.value?.uuid], load, { immediate: true })
onUnmounted(() => {
	requestId++
})
</script>

<template>
	<section class="announcements">
		<header class="flex items-center gap-2 border-0 border-b border-solid border-surface-5 pb-4">
			<NewspaperIcon class="size-5 text-brand" />
			<h2 class="m-0 text-base font-semibold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<span
				v-if="announcements.length"
				class="ml-auto rounded-full bg-button-bg px-2 py-0.5 text-xs text-secondary"
				>{{ announcements.length }}</span
			>
		</header>

		<div v-if="loading" class="announcement-feedback" role="status">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<div v-else-if="failed" class="announcement-feedback">
			<p class="m-0">{{ formatMessage(messages.failed) }}</p>
			<button type="button" class="text-brand hover:underline" @click="retry">
				{{ formatMessage(commonMessages.retryButton) }}
			</button>
		</div>
		<p v-else-if="skinSiteStatus === 'signed-out'" class="announcement-feedback">
			{{ formatMessage(messages.signedOut) }}
		</p>
		<p v-else-if="!announcements.length" class="announcement-feedback">
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="flex flex-col">
			<article v-for="item in announcements" :key="item.id" class="announcement-entry">
				<div class="flex items-start gap-2">
					<StarIcon v-if="item.star" class="mt-0.5 size-4 shrink-0 text-brand" />
					<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
						{{ item.title }}
					</span>
					<span class="shrink-0 text-xs text-secondary">{{ formatDate(item.updateAt) }}</span>
				</div>
				<p v-if="item.subtitle" class="m-0 text-sm leading-relaxed text-secondary">
					{{ item.subtitle }}
				</p>
			</article>
		</div>
	</section>
</template>

<style scoped>
.announcements {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 0.5rem;
	padding: 1.5rem;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-xl);
	background: var(--color-raised-bg);
}
.announcement-entry {
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
	padding: 1.25rem 0;
	border-bottom: 1px solid var(--color-divider);
}
.announcement-entry:last-child {
	border-bottom: 0;
	padding-bottom: 0.25rem;
}
.announcement-feedback {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.625rem;
	margin: 0;
	padding: 1.5rem 0 0.5rem;
	color: var(--color-secondary);
	font-size: 0.875rem;
}
</style>
