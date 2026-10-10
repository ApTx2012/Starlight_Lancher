<script setup lang="ts">
import { FolderOpenIcon, UploadIcon } from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

import { showLauncherLogsFolder } from '@/helpers/utils'

import LogExportModal from './LogExportModal.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const exportModal = ref<InstanceType<typeof LogExportModal>>()

const messages = defineMessages({
	exportTitle: { id: 'app.settings.logs.export.title', defaultMessage: 'Export logs' },
	exportDescription: {
		id: 'app.settings.logs.export.description',
		defaultMessage:
			'Package launcher logs with an optional environment summary, instance log, and crash analysis.',
	},
	exportButton: { id: 'app.settings.logs.export.button', defaultMessage: 'Export logs…' },
	openFolder: { id: 'app.settings.logs.open-folder', defaultMessage: 'Open logs folder' },
})

async function openLogsFolder() {
	try {
		await showLauncherLogsFolder()
	} catch (error) {
		handleError(error)
	}
}
</script>

<template>
	<div class="flex flex-col gap-6">
		<SettingsSection
			:title="formatMessage(messages.exportTitle)"
			:description="formatMessage(messages.exportDescription)"
			title-id="settings-target-logs-export"
		>
			<SettingsRow stacked>
				<template #label>
					<span>{{ formatMessage(messages.exportTitle) }}</span>
				</template>
				<template #description>{{ formatMessage(messages.exportDescription) }}</template>
				<template #control>
					<div class="flex flex-wrap gap-2">
						<Button type="colored" color="brand" @click="exportModal?.show()"
							><UploadIcon />
							{{ formatMessage(messages.exportButton) }}
						</Button>
						<Button @click="openLogsFolder"
							><FolderOpenIcon />
							{{ formatMessage(messages.openFolder) }}
						</Button>
					</div>
				</template>
			</SettingsRow>
		</SettingsSection>

		<LogExportModal ref="exportModal" />
	</div>
</template>
