<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.header)"
		max-width="560px"
		:on-hide="handleHide"
	>
		<div class="flex flex-col gap-4">
			<p class="m-0 text-secondary">
				{{ formatMessage(messages.description) }}
			</p>

			<div class="flex flex-col gap-2">
				<span class="font-semibold text-contrast">
					{{ formatMessage(messages.gameDirLabel) }}
				</span>
				<div class="flex gap-2">
					<StyledInput
						class="flex-1"
						:model-value="selectedPath"
						readonly
						:placeholder="defaultPath || formatMessage(messages.noSelection)"
					/>
					<ButtonStyled>
						<button type="button" @click="browse">
							<FolderOpenIcon />
							{{ formatMessage(messages.browse) }}
						</button>
					</ButtonStyled>
				</div>
				<button
					v-if="defaultPath && selectedPath !== defaultPath"
					type="button"
					class="self-start text-sm text-brand underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current"
					@click="selectedPath = defaultPath"
				>
					{{ formatMessage(messages.resetDefault) }}
				</button>
			</div>

			<p v-if="previewPath" class="m-0 text-sm text-secondary break-all">
				{{ formatMessage(messages.preview, { path: previewPath }) }}
			</p>
		</div>

		<template #actions>
			<div class="flex justify-end gap-2">
				<ButtonStyled type="outlined">
					<button type="button" @click="handleCancel">
						<XIcon />
						{{ formatMessage(commonMessages.cancelButton) }}
					</button>
				</ButtonStyled>
				<ButtonStyled color="brand">
					<button type="button" :disabled="!selectedPath" @click="handleConfirm">
						<CheckIcon />
						{{ formatMessage(messages.confirm) }}
					</button>
				</ButtonStyled>
			</div>
		</template>
	</NewModal>
</template>

<script setup lang="ts">
import { CheckIcon, FolderOpenIcon, XIcon } from '@modrinth/assets'
import {
	ButtonStyled,
	commonMessages,
	defineMessages,
	injectFilePicker,
	NewModal,
	StyledInput,
	useVIntl,
} from '@modrinth/ui'
import { invoke } from '@tauri-apps/api/core'
import { computed, ref } from 'vue'

const emit = defineEmits<{
	(e: 'confirm', gameDirRoot: string): void
	(e: 'cancel'): void
}>()

const { formatMessage } = useVIntl()
const filePicker = injectFilePicker()
const modal = ref<InstanceType<typeof NewModal>>()
const defaultPath = ref('')
const selectedPath = ref('')
const accepted = ref(false)

const messages = defineMessages({
	header: {
		id: 'app.hosted-install.game-dir.header',
		defaultMessage: 'Choose game directory',
	},
	description: {
		id: 'app.hosted-install.game-dir.description',
		defaultMessage:
			'StarLight instance data (mods, saves, configs, resource packs) is stored in an external game directory. Pick a root folder — the modpack gets its own subfolder inside it.',
	},
	gameDirLabel: {
		id: 'app.hosted-install.game-dir.label',
		defaultMessage: 'Game directory root',
	},
	browse: {
		id: 'app.hosted-install.game-dir.browse',
		defaultMessage: 'Browse',
	},
	noSelection: {
		id: 'app.hosted-install.game-dir.no-selection',
		defaultMessage: 'No folder selected',
	},
	resetDefault: {
		id: 'app.hosted-install.game-dir.reset-default',
		defaultMessage: 'Use default location',
	},
	preview: {
		id: 'app.hosted-install.game-dir.preview',
		defaultMessage: 'Game files will be installed to: {path}',
	},
	confirm: {
		id: 'app.hosted-install.game-dir.confirm',
		defaultMessage: 'Install',
	},
})

const previewPath = computed(() => {
	const base = (selectedPath.value ?? '').replace(/[\\/]+$/, '')
	return base ? `${base}/<pack name>` : ''
})

async function show() {
	if (!defaultPath.value) {
		defaultPath.value = await invoke<string>('get_launcher_root_dir').catch(() => '')
	}
	if (!selectedPath.value) selectedPath.value = defaultPath.value
	accepted.value = false
	modal.value?.show()
}

async function browse() {
	const picked = await filePicker.pickFolder?.()
	if (picked?.path) selectedPath.value = picked.path
}

function handleCancel() {
	modal.value?.hide()
}

function handleConfirm() {
	accepted.value = true
	modal.value?.hide()
	emit('confirm', selectedPath.value)
}

function handleHide() {
	if (!accepted.value) emit('cancel')
}

defineExpose({ show })
</script>