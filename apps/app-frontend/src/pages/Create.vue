<script setup lang="ts">
import { FolderOpenIcon, LeftArrowIcon, SparklesIcon } from '@modrinth/assets'
import { BigOptionButton, Button, defineMessages, useVIntl } from '@modrinth/ui'
import { inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import InstanceModeOptions from '@/components/instance/InstanceModeOptions.vue'
import type { InstanceMode } from '@/helpers/hosted-packs'

const { formatMessage } = useVIntl()
const router = useRouter()
const instanceMode = ref<InstanceMode>('local')

const showModal = inject<
	(options?: {
		skipSetupType?: boolean
		initialMode?: 'custom' | 'import'
		instanceMode?: InstanceMode
		onBack?: () => void
	}) => void
>('showCreationModalWithOptions')

const messages = defineMessages({
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

function handleStartFresh() {
	showModal?.({
		skipSetupType: true,
		initialMode: 'custom',
		instanceMode: instanceMode.value,
		onBack: () => router.push('/create'),
	})
}

function handleImportExisting() {
	showModal?.({
		skipSetupType: true,
		initialMode: 'import',
		instanceMode: 'local',
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

			<InstanceModeOptions v-model="instanceMode" data-onboarding-id="creation-instance-mode" />
			<div data-onboarding-id="creation-methods" class="flex flex-col gap-4 sm:flex-row">
				<BigOptionButton
					data-onboarding-id="creation-method-custom"
					:icon="SparklesIcon"
					:title="formatMessage(messages.newTitle)"
					:description="formatMessage(messages.newDescription)"
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

			<p class="m-0 text-sm text-secondary">
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
