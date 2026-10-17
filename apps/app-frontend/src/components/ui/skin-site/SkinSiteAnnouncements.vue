<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

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
})

const announcements = ref<SkinSiteAnnouncement[]>([])
const loading = ref(true)
const failed = ref(false)

function formatDate(ts: number): string {
	try {
		return new Date(ts).toLocaleDateString()
	} catch {
		return ''
	}
}

onMounted(async () => {
	try {
		const result = await skinSiteAnnouncements()
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
		failed.value = true
	} finally {
		loading.value = false
	}
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
		<p v-else-if="failed" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
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
