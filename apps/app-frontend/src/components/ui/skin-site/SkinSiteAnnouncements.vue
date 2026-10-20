<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
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
	<div class="flex flex-col gap-2">
		<h3 class="m-0 text-base font-semibold text-contrast">
			{{ formatMessage(messages.title) }}
		</h3>

		<div v-if="loading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<div v-else-if="failed" class="flex items-center gap-2 text-sm text-secondary">
			<p class="m-0">{{ formatMessage(messages.failed) }}</p>
			<button type="button" class="text-brand hover:underline" @click="retry">
				{{ formatMessage(commonMessages.retryButton) }}
			</button>
		</div>
		<p v-else-if="skinSiteStatus === 'signed-out'" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.signedOut) }}
		</p>
		<p v-else-if="!announcements.length" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="flex flex-col gap-2">
			<div
				v-for="item in announcements"
				:key="item.id"
				class="flex flex-col gap-1 rounded-xl border border-solid border-surface-5 bg-bg-raised p-3"
			>
				<div class="flex items-start gap-2">
					<span class="min-w-0 flex-1 truncate text-sm font-semibold text-contrast">
						{{ item.title }}
					</span>
					<span class="shrink-0 text-xs text-secondary">{{ formatDate(item.updateAt) }}</span>
				</div>
				<span v-if="item.subtitle" class="truncate text-xs text-secondary">{{
					item.subtitle
				}}</span>
			</div>
		</div>
	</div>
</template>
