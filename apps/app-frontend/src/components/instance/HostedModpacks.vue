<template>
	<InstanceModeSettings :instance-id="instanceId" :disabled="syncing" class="mb-5" />
	<div v-if="modeQuery.data.value === 'local'" class="flex flex-col gap-3">
		<h2 class="m-0">{{ formatMessage(messages.localTitle) }}</h2>
		<p class="m-0 text-secondary">{{ formatMessage(messages.localPacks) }}</p>
		<div class="flex flex-wrap gap-3">
			<ButtonStyled
				><button type="button" @click="router.push('/browse/modpack')">
					{{ formatMessage(messages.browse) }}
				</button></ButtonStyled
			>
			<ButtonStyled
				><button type="button" @click="importLocal">
					{{ formatMessage(messages.importLocal) }}
				</button></ButtonStyled
			>
		</div>
	</div>
	<template v-if="modeQuery.data.value === 'starlight'">
		<section class="flex flex-col gap-4" :aria-busy="loading || syncing">
			<div class="flex items-center justify-between gap-4">
				<div>
					<h2 class="m-0">{{ formatMessage(messages.title) }}</h2>
					<p>{{ formatMessage(messages.description) }}</p>
				</div>
				<ButtonStyled
					><button type="button" :disabled="loading || syncing" @click="load">
						{{ formatMessage(messages.refresh) }}
					</button></ButtonStyled
				>
			</div>
			<p v-if="loading" role="status">{{ formatMessage(messages.loading) }}</p>
			<p v-if="error" role="alert" class="text-red">{{ error }}</p>
			<p v-if="binding">
				{{
					formatMessage(messages.bound, {
						name: binding.publication.manifest.name,
						version: binding.publication.manifest.version,
					})
				}}
			</p>
			<p v-if="syncing" role="status">{{ formatMessage(messages.syncing) }}</p>
			<div v-if="result" role="status" class="rounded-xl bg-bg-raised p-4">
				<p>
					{{
						formatMessage(messages.complete, {
							version: result.version,
							count: result.changedFiles,
							size: (result.downloadedBytes / 1048576).toFixed(2),
						})
					}}
				</p>
				<details v-if="result.preservedFiles.length">
					<summary>
						{{ formatMessage(messages.preserved, { count: result.preservedFiles.length }) }}
					</summary>
					<ul>
						<li v-for="path in result.preservedFiles" :key="path">{{ path }}</li>
					</ul>
				</details>
			</div>
			<p v-if="!loading && ready && !catalog.length">{{ formatMessage(messages.empty) }}</p>
			<article
				v-for="pack in catalog"
				:key="pack.packId"
				class="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-bg-raised p-4"
			>
				<div>
					<h3 class="m-0">{{ pack.manifest.name }}</h3>
					<p class="mb-0">
						{{ pack.manifest.version }} · Minecraft {{ pack.manifest.runtime.gameVersion }} ·
						{{ pack.manifest.runtime.loader }}
					</p>
				</div>
				<ButtonStyled color="brand"
					><button
						type="button"
						:disabled="
							!ready ||
							syncing ||
							loading ||
							(!!binding && binding.publication.packId !== pack.packId)
						"
						@click="sync(pack.packId)"
					>
						{{ formatMessage(binding ? messages.update : messages.install) }}
					</button></ButtonStyled
				>
			</article>
		</section>
	</template>
</template>
<script setup lang="ts">
import { ButtonStyled, defineMessages, useVIntl } from '@modrinth/ui'
import { inject, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import InstanceModeSettings from '@/components/instance/InstanceModeSettings.vue'
import { useInstanceMode } from '@/composables/useInstanceMode'

import {
	type HostedBinding,
	hostedBinding,
	hostedCatalog,
	type HostedPublication,
	hostedSync,
	type HostedSyncResult,
} from '@/helpers/hosted-packs'
const props = defineProps<{ instanceId: string }>()
const modeQuery = useInstanceMode(() => props.instanceId)
const router = useRouter()
const showCreation = inject<
	(options: { skipSetupType: boolean; initialMode: 'import'; instanceMode: 'local' }) => void
>('showCreationModalWithOptions')
function importLocal() {
	showCreation?.({ skipSetupType: true, initialMode: 'import', instanceMode: 'local' })
}
const { formatMessage } = useVIntl()
const messages = defineMessages({
	localTitle: { id: 'app.instance-mode.local-packs-title', defaultMessage: 'Local modpacks' },
	localPacks: {
		id: 'app.instance-mode.local-packs',
		defaultMessage:
			'Choose any modpack to install as a local instance. Existing files and worlds are kept when you switch to Local; StarLight changes will no longer be synchronized.',
	},
	browse: { id: 'app.instance-mode.browse', defaultMessage: 'Browse modpacks' },
	importLocal: { id: 'app.instance-mode.import', defaultMessage: 'Import as a local instance' },
	title: { id: 'app.hosted-packs.title', defaultMessage: 'Published modpacks' },
	description: {
		id: 'app.hosted-packs.description',
		defaultMessage:
			'Install an approved modpack into this instance. Future online launches automatically download changed files. Use a separate empty instance for each pack; saves and personal settings are preserved.',
	},
	refresh: { id: 'app.hosted-packs.refresh', defaultMessage: 'Refresh' },
	loading: { id: 'app.hosted-packs.loading', defaultMessage: 'Loading published modpacks…' },
	bound: { id: 'app.hosted-packs.bound', defaultMessage: 'Installed: {name} · {version}' },
	syncing: {
		id: 'app.hosted-packs.syncing',
		defaultMessage: 'Comparing files and synchronizing changes…',
	},
	complete: {
		id: 'app.hosted-packs.complete',
		defaultMessage: 'Synced to {version}. Changed {count} files; downloaded {size} MiB.',
	},
	preserved: {
		id: 'app.hosted-packs.preserved',
		defaultMessage: 'Preserved {count} locally modified or personal files',
	},
	empty: {
		id: 'app.hosted-packs.empty',
		defaultMessage: 'No modpacks have been approved for publication yet.',
	},
	update: { id: 'app.hosted-packs.update', defaultMessage: 'Synchronize now' },
	install: { id: 'app.hosted-packs.install', defaultMessage: 'Install and enable automatic sync' },
})
const catalog = ref<HostedPublication[]>([])
const binding = ref<HostedBinding | null>(null)
const result = ref<HostedSyncResult | null>(null)
const loading = ref(false)
const syncing = ref(false)
const ready = ref(false)
const error = ref('')
let generation = 0
async function load() {
	if (modeQuery.data.value !== 'starlight') return
	const current = ++generation
	const instanceId = props.instanceId
	loading.value = true
	ready.value = false
	error.value = ''
	try {
		const [packs, installed] = await Promise.all([hostedCatalog(), hostedBinding(instanceId)])
		if (current !== generation) return
		catalog.value = packs
		binding.value = installed
		ready.value = true
	} catch (cause) {
		if (current === generation) error.value = String(cause)
	} finally {
		if (current === generation) loading.value = false
	}
}
async function sync(packId: string) {
	if (syncing.value || !ready.value || modeQuery.data.value !== 'starlight') return
	const instanceId = props.instanceId
	syncing.value = true
	error.value = ''
	result.value = null
	try {
		const completed = await hostedSync(instanceId, packId)
		if (props.instanceId !== instanceId) return
		result.value = completed
		await load()
	} catch (cause) {
		if (props.instanceId === instanceId) error.value = String(cause)
	} finally {
		syncing.value = false
	}
}
watch(
	() => [props.instanceId, modeQuery.data.value] as const,
	() => {
		generation++
		loading.value = false
		ready.value = false
		error.value = ''
		catalog.value = []
		binding.value = null
		result.value = null
		void load()
	},
	{ immediate: true },
)
</script>
