<script setup lang="ts">
import { FolderOpenIcon, LeftArrowIcon, SparklesIcon } from '@modrinth/assets'
import { BigOptionButton, Button, defineMessages, useVIntl } from '@modrinth/ui'
import { inject, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InstanceModeOptions from '@/components/instance/InstanceModeOptions.vue'
import HostedGameDirModal from '@/components/instance/HostedGameDirModal.vue'
import HostedPackProgress from '@/components/instance/HostedPackProgress.vue'
import type { InstanceMode } from '@/helpers/hosted-packs'
import { useHostedCreation } from '@/composables/useHostedCreation'

const { formatMessage } = useVIntl()
const router = useRouter()
const { installing, installError, createdInstance, completed, acknowledge, install } =
	useHostedCreation()
const instanceMode = ref<InstanceMode>(
	installing.value || createdInstance.value ? 'starlight' : 'local',
)

const hostedGameDirModal = ref<InstanceType<typeof HostedGameDirModal>>()

// One-click StarLight installs reuse the same external game-directory choice
// as the custom creation flow: the pack gets its own folder under `<root>`.
function promptHostedGameDir() {
	hostedGameDirModal.value?.show()
}

async function installHostedWithGameDir(gameDirRoot: string) {
	await install(gameDirRoot)
}
async function openCompleted(instanceId: string) {
	try {
		const failure = await router.push(`/instance/${encodeURIComponent(instanceId)}/`)
		if (!failure) acknowledge(instanceId)
		else installError.value = failure.message
	} catch (cause) {
		installError.value = String(cause)
	}
}
watch(
	() => (completed.value ? createdInstance.value : undefined),
	(instanceId) => {
		if (instanceId) void openCompleted(instanceId)
	},
	{ immediate: true },
)

const showModal = inject<
	(options?: {
		skipSetupType?: boolean
		initialMode?: 'custom' | 'import'
		onBack?: () => void
	}) => void
>('showCreationModalWithOptions')

const messages = defineMessages({
	openInstance: { id: 'app.hosted-packs.open-instance', defaultMessage: 'Open installed instance' },
	autoInstall: {
		id: 'app.hosted-packs.auto-install',
		defaultMessage: 'Install the StarLight modpack',
	},
	autoDescription: {
		id: 'app.hosted-packs.auto-description',
		defaultMessage:
			'Download and automatically install the modpack from StarLight to play on the StarLight server with one click.',
	},
	autoInstalling: {
		id: 'app.hosted-packs.auto-installing',
		defaultMessage: 'Downloading and installing the server modpack…',
	},
	retryInstall: { id: 'app.hosted-packs.retry-install', defaultMessage: 'Retry installation' },
	title: {
		id: 'create.title',
		defaultMessage: 'Create Instance',
	},
	subtitle: {
		id: 'create.subtitle',
		defaultMessage: 'Start a new adventure or bring your existing worlds',
	},
	newTitle: {
		id: 'create.new.title',
		defaultMessage: 'Start Fresh',
	},
	newDescription: {
		id: 'create.new.description',
		defaultMessage: 'Create a new Minecraft instance from scratch.',
	},
	importTitle: {
		id: 'create.import.title',
		defaultMessage: 'Import Existing',
	},
	importDescription: {
		id: 'create.import.description',
		defaultMessage: 'Import instances from other launchers or install a modpack.',
	},
	back: {
		id: 'create.back',
		defaultMessage: 'Back to Library',
	},
	pclHmclHint: {
		id: 'create.pcl-hmcl-hint',
		defaultMessage: 'Using PCL / HMCL?',
	},
	addMinecraftFolder: {
		id: 'create.add-minecraft-folder',
		defaultMessage: 'Add .minecraft folder',
	},
})

const navigateBack = () => router.push('/library')

async function handleStartFresh() {
	if (installing.value) return
	if (instanceMode.value === 'starlight') {
		if (completed.value && createdInstance.value) {
			await openCompleted(createdInstance.value)
			return
		}
		if (createdInstance.value) {
			// A previous attempt already created the instance; retry in place.
			await install()
			return
		}
		promptHostedGameDir()
		return
	}
	showModal?.({
		skipSetupType: true,
		initialMode: 'custom',
		onBack: () => router.push('/create'),
	})
}

function handleImportExisting() {
	showModal?.({
		skipSetupType: true,
		initialMode: 'import',
		onBack: () => router.push('/create'),
	})
}
</script>

<template>
	<div class="flex h-full w-full flex-col items-center overflow-y-auto p-6">
		<div class="my-auto flex w-full max-w-2xl shrink-0 flex-col gap-6">
			<div class="flex flex-col gap-2">
				<h1 class="m-0 text-2xl font-bold text-contrast">
					{{ formatMessage(messages.title) }}
				</h1>
				<p class="m-0 text-sm text-secondary">
					{{ formatMessage(messages.subtitle) }}
				</p>
			</div>

			<InstanceModeOptions
				v-model="instanceMode"
				:disabled="installing"
				data-onboarding-id="creation-instance-mode"
			/>
			<div data-onboarding-id="creation-methods" class="flex flex-col gap-4 sm:flex-row">
				<BigOptionButton
					:data-onboarding-id="
						instanceMode === 'starlight' ? 'creation-method-starlight' : 'creation-method-custom'
					"
					:disabled="installing"
					:icon="SparklesIcon"
					:title="
						formatMessage(
							instanceMode === 'starlight'
								? installing
									? messages.autoInstalling
									: completed
										? messages.openInstance
										: createdInstance
											? messages.retryInstall
											: messages.autoInstall
								: messages.newTitle,
						)
					"
					:description="
						formatMessage(
							instanceMode === 'starlight' ? messages.autoDescription : messages.newDescription,
						)
					"
					no-icon-box
					@click="handleStartFresh"
				/>

				<BigOptionButton
					data-onboarding-id="creation-method-import"
					v-if="instanceMode === 'local'"
					:icon="FolderOpenIcon"
					:title="formatMessage(messages.importTitle)"
					:description="formatMessage(messages.importDescription)"
					no-icon-box
					@click="handleImportExisting"
				/>
			</div>

			<HostedGameDirModal
				ref="hostedGameDirModal"
				@confirm="installHostedWithGameDir"
			/>
			<HostedPackProgress :instance-id="createdInstance" :active="installing" />
			<p v-if="installError" class="m-0 text-red" role="alert">{{ installError }}</p>
			<p v-if="instanceMode === 'local'" class="m-0 text-sm text-secondary">
				{{ formatMessage(messages.pclHmclHint) }}
				{{ ' ' }}
				<RouterLink
					to="/settings#storage-backups"
					class="text-brand underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current"
				>
					{{ formatMessage(messages.addMinecraftFolder) }}
				</RouterLink>
			</p>

			<Button transparent class="self-start" @click="navigateBack">
				<LeftArrowIcon class="size-4" stroke-width="2" />
				{{ formatMessage(messages.back) }}
			</Button>
		</div>
	</div>
</template>
