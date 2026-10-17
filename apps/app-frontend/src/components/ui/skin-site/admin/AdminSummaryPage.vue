<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { type SkinSiteAdminStatus, skinSiteAdminStatus } from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.summary.title', defaultMessage: 'System overview' },
	loading: { id: 'app.skin-site.admin.summary.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.admin.summary.failed', defaultMessage: 'Could not load status.' },
	uptime: { id: 'app.skin-site.admin.summary.uptime', defaultMessage: 'Uptime' },
	memory: { id: 'app.skin-site.admin.summary.memory', defaultMessage: 'Memory usage' },
	users: { id: 'app.skin-site.admin.summary.users', defaultMessage: 'Users' },
	players: { id: 'app.skin-site.admin.summary.players', defaultMessage: 'Players' },
	realtimeHint: {
		id: 'app.skin-site.admin.summary.realtime-hint',
		defaultMessage:
			'Live CPU and GC charts require the admin WebSocket, which is not connected yet.',
	},
})

const status = ref<SkinSiteAdminStatus | null>(null)
const loading = ref(true)
const failed = ref(false)
const now = ref(Date.now())
let ticker: number | undefined

const uptime = computed(() => {
	if (!status.value) return ''
	let ms = now.value - status.value.bootTime
	if (ms < 0) ms = 0
	const totalSeconds = Math.floor(ms / 1000)
	const days = Math.floor(totalSeconds / 86400)
	const hours = Math.floor((totalSeconds % 86400) / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	const parts: string[] = []
	if (days) parts.push(days + 'd')
	if (hours) parts.push(hours + 'h')
	if (minutes) parts.push(minutes + 'm')
	parts.push(seconds + 's')
	return parts.join(' ')
})

function formatSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '—'
	const units = ['B', 'KB', 'MB', 'GB', 'TB']
	let value = bytes
	let idx = 0
	while (value >= 1024 && idx < units.length - 1) {
		value /= 1024
		idx++
	}
	return value.toFixed(idx === 0 ? 0 : 2) + ' ' + units[idx]
}

async function load() {
	loading.value = true
	failed.value = false
	try {
		const result = await skinSiteAdminStatus()
		if (!result.success) throw new Error(result.errorMessage)
		status.value = result.payload
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	void load()
	ticker = window.setInterval(() => {
		now.value = Date.now()
	}, 1000)
})

onUnmounted(() => {
	if (ticker) clearInterval(ticker)
})
</script>
<template>
	<div class="flex flex-col gap-4">
		<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>

		<div v-if="loading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p v-else-if="failed" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
		</p>

		<template v-else-if="status">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<div class="flex flex-col gap-1 rounded-xl bg-bg-raised p-4">
					<span class="text-xs text-secondary">{{ formatMessage(messages.uptime) }}</span>
					<span class="text-xl font-bold text-contrast">{{ uptime }}</span>
				</div>
				<div class="flex flex-col gap-1 rounded-xl bg-bg-raised p-4">
					<span class="text-xs text-secondary">{{ formatMessage(messages.memory) }}</span>
					<span class="text-xl font-bold text-contrast">{{ formatSize(status.memoryUsage) }}</span>
				</div>
				<div class="flex flex-col gap-1 rounded-xl bg-bg-raised p-4">
					<span class="text-xs text-secondary">{{ formatMessage(messages.users) }}</span>
					<span class="text-xl font-bold text-contrast">{{ status.userCount }}</span>
				</div>
				<div class="flex flex-col gap-1 rounded-xl bg-bg-raised p-4">
					<span class="text-xs text-secondary">{{ formatMessage(messages.players) }}</span>
					<span class="text-xl font-bold text-contrast">{{ status.playerCount }}</span>
				</div>
			</div>

			<p class="m-0 rounded-xl border border-dashed border-surface-5 p-3 text-xs text-secondary">
				{{ formatMessage(messages.realtimeHint) }}
			</p>
		</template>
	</div>
</template>
