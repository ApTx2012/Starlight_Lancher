<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	type SkinSiteMapServer,
	skinSiteMapServers,
	skinSiteSaveMapServers,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.servers.title', defaultMessage: 'Map servers' },
	loading: { id: 'app.skin-site.admin.servers.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.admin.servers.failed', defaultMessage: 'Could not load servers.' },
	empty: { id: 'app.skin-site.admin.servers.empty', defaultMessage: 'No map servers configured.' },
	serverName: { id: 'app.skin-site.admin.servers.server-name', defaultMessage: 'Server name' },
	internal: { id: 'app.skin-site.admin.servers.internal', defaultMessage: 'Internal' },
	maps: { id: 'app.skin-site.admin.servers.maps', defaultMessage: 'Maps' },
	mapName: { id: 'app.skin-site.admin.servers.map-name', defaultMessage: 'Map name' },
	mapUrl: { id: 'app.skin-site.admin.servers.map-url', defaultMessage: 'Map URL' },
	addMap: { id: 'app.skin-site.admin.servers.add-map', defaultMessage: 'Add map' },
	removeMap: { id: 'app.skin-site.admin.servers.remove-map', defaultMessage: 'Remove' },
	addServer: { id: 'app.skin-site.admin.servers.add-server', defaultMessage: 'Add server' },
	removeServer: {
		id: 'app.skin-site.admin.servers.remove-server',
		defaultMessage: 'Remove server',
	},
	save: { id: 'app.skin-site.admin.servers.save', defaultMessage: 'Save changes' },
	saving: { id: 'app.skin-site.admin.servers.saving', defaultMessage: 'Saving…' },
	saved: { id: 'app.skin-site.admin.servers.saved', defaultMessage: 'Map servers saved.' },
})

const servers = ref<SkinSiteMapServer[]>([])
const loading = ref(true)
const failed = ref(false)
const saving = ref(false)

async function load() {
	loading.value = true
	failed.value = false
	try {
		const result = await skinSiteMapServers()
		if (!result.success) throw new Error(result.errorMessage)
		servers.value = result.payload ?? []
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
	}
}

function addServer() {
	servers.value.push({ name: '', internal: false, maps: [{ name: '', url: '' }] })
}

function removeServer(index: number) {
	servers.value.splice(index, 1)
}

function addMap(server: SkinSiteMapServer) {
	server.maps.push({ name: '', url: '' })
}

function removeMap(server: SkinSiteMapServer, index: number) {
	server.maps.splice(index, 1)
}

async function save() {
	if (saving.value) return
	saving.value = true
	try {
		const cleaned = servers.value.map((s) => ({
			name: s.name.trim(),
			internal: s.internal,
			maps: s.maps
				.filter((m) => m.name.trim() || m.url.trim())
				.map((m) => ({ name: m.name.trim(), url: m.url.trim() })),
		}))
		const result = await skinSiteSaveMapServers(cleaned)
		if (!result.success) throw new Error(result.errorMessage)
		servers.value = result.payload ?? cleaned
		addNotification({ type: 'success', title: formatMessage(messages.saved) })
	} catch (error) {
		handleError(error)
	} finally {
		saving.value = false
	}
}

onMounted(() => void load())
</script>
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
			<button
				type="button"
				class="rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
				@click="addServer"
			>
				{{ formatMessage(messages.addServer) }}
			</button>
			<button
				type="button"
				class="ml-auto rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
				:disabled="saving"
				@click="save"
			>
				{{ saving ? formatMessage(messages.saving) : formatMessage(messages.save) }}
			</button>
		</div>

		<div v-if="loading" class="flex items-center gap-2 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p v-else-if="failed" class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.failed) }}
		</p>
		<p v-else-if="!servers.length" class="m-0 rounded-xl bg-bg-raised p-4 text-sm text-secondary">
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="flex flex-col gap-3">
			<div
				v-for="(server, si) in servers"
				:key="si"
				class="flex flex-col gap-2 rounded-xl bg-bg-raised p-3"
			>
				<div class="flex flex-wrap items-center gap-2">
					<input
						v-model="server.name"
						type="text"
						:placeholder="formatMessage(messages.serverName)"
						class="min-w-0 flex-1 rounded-lg border border-solid border-surface-5 bg-bg px-3 py-1.5 text-sm text-contrast outline-none focus:border-brand"
					/>
					<label class="flex shrink-0 items-center gap-1.5 text-xs text-contrast">
						<input v-model="server.internal" type="checkbox" />
						{{ formatMessage(messages.internal) }}
					</label>
					<button
						type="button"
						class="shrink-0 rounded-full bg-red px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="removeServer(si)"
					>
						{{ formatMessage(messages.removeServer) }}
					</button>
				</div>

				<span class="text-xs font-semibold text-secondary">
					{{ formatMessage(messages.maps) }}
				</span>
				<div v-for="(map, mi) in server.maps" :key="mi" class="flex flex-wrap items-center gap-2">
					<input
						v-model="map.name"
						type="text"
						:placeholder="formatMessage(messages.mapName)"
						class="w-40 rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
					/>
					<input
						v-model="map.url"
						type="text"
						:placeholder="formatMessage(messages.mapUrl)"
						class="min-w-0 flex-1 rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
					/>
					<button
						type="button"
						class="shrink-0 rounded-full bg-button-bg px-2 py-1 text-[10px] font-semibold text-secondary hover:text-red"
						@click="removeMap(server, mi)"
					>
						{{ formatMessage(messages.removeMap) }}
					</button>
				</div>
				<button
					type="button"
					class="w-fit rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-secondary hover:brightness-110"
					@click="addMap(server)"
				>
					{{ formatMessage(messages.addMap) }}
				</button>
			</div>
		</div>
	</div>
</template>
