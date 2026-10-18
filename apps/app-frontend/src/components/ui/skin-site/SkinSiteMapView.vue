<script setup lang="ts">
import { ExternalIcon, SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref, watch } from 'vue'

import { type SkinSitePublicMapServer, skinSitePublicMapServers } from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.map.title', defaultMessage: 'Server map' },
	back: { id: 'app.skin-site.map.back', defaultMessage: 'Back to home' },
	internal: { id: 'app.skin-site.map.internal', defaultMessage: 'Internal' },
	external: { id: 'app.skin-site.map.external', defaultMessage: 'External' },
	server: { id: 'app.skin-site.map.server', defaultMessage: 'Server' },
	map: { id: 'app.skin-site.map.map', defaultMessage: 'Map' },
	openExternal: { id: 'app.skin-site.map.open', defaultMessage: 'Open in browser' },
	loading: { id: 'app.skin-site.map.loading', defaultMessage: 'Loading maps…' },
	empty: { id: 'app.skin-site.map.empty', defaultMessage: 'No maps available.' },
	failed: { id: 'app.skin-site.map.failed', defaultMessage: 'Could not load maps.' },
})

const emit = defineEmits<{ (e: 'back'): void }>()

const servers = ref<SkinSitePublicMapServer[]>([])
const internal = ref(false)
const serverIndex = ref(0)
const mapIndex = ref(0)
const loading = ref(true)
const failed = ref(false)

const filteredServers = computed(() => servers.value.filter((s) => s.internal === internal.value))
const selectedServer = computed(() => filteredServers.value[serverIndex.value])
const selectedMap = computed(() => selectedServer.value?.maps[mapIndex.value])

watch(internal, () => {
	serverIndex.value = 0
	mapIndex.value = 0
})
watch(serverIndex, () => {
	mapIndex.value = 0
})

async function openExternal() {
	if (!selectedMap.value) return
	const { openUrl } = await import('@tauri-apps/plugin-opener')
	await openUrl(selectedMap.value.url)
}

async function load() {
	loading.value = true
	failed.value = false
	try {
		const result = await skinSitePublicMapServers()
		if (!result.success) throw new Error(result.errorMessage)
		servers.value = result.payload ?? []
		if (!servers.value.some((s) => !s.internal)) internal.value = true
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
	}
}

onMounted(load)
</script>
<template>
	<div class="flex h-full min-h-0 flex-col gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="flex items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
				@click="emit('back')"
			>
				← {{ formatMessage(messages.back) }}
			</button>
			<h1 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h1>

			<select
				v-model="internal"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
			>
				<option :value="false">{{ formatMessage(messages.external) }}</option>
				<option :value="true">{{ formatMessage(messages.internal) }}</option>
			</select>

			<select
				v-if="filteredServers.length"
				v-model.number="serverIndex"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
			>
				<option v-for="(server, index) in filteredServers" :key="index" :value="index">
					{{ server.name }}
				</option>
			</select>

			<select
				v-if="selectedServer?.maps.length"
				v-model.number="mapIndex"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast"
			>
				<option v-for="(map, index) in selectedServer.maps" :key="index" :value="index">
					{{ map.name }}
				</option>
			</select>

			<button
				v-if="selectedMap"
				type="button"
				class="ml-auto flex items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
				@click="openExternal"
			>
				<ExternalIcon class="size-3.5" />
				{{ formatMessage(messages.openExternal) }}
			</button>
		</div>

		<div
			v-if="loading"
			class="flex flex-1 items-center justify-center gap-2 text-sm text-secondary"
		>
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p v-else-if="failed" class="m-0 flex-1 text-center text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
		</p>
		<p v-else-if="!selectedMap" class="m-0 flex-1 text-center text-sm text-secondary">
			{{ formatMessage(messages.empty) }}
		</p>
		<iframe
			v-else
			:key="selectedMap.url"
			:src="selectedMap.url"
			:title="`${selectedServer?.name} · ${selectedMap.name}`"
			class="min-h-0 w-full flex-1 rounded-lg border border-solid border-surface-5"
			allow="fullscreen"
		/>
	</div>
</template>
