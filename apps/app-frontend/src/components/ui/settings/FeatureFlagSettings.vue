<script setup lang="ts">
import { WrenchIcon } from '@modrinth/assets'
import {
	defineMessages,
	injectNotificationManager,
	NewButton as Button,
	Toggle,
	useVIntl,
} from '@modrinth/ui'
import { inject, ref, watch } from 'vue'

import { get as getSettings, set as setSettings } from '@/helpers/settings.ts'
import { isDev } from '@/helpers/utils'
import { handleSevereError } from '@/store/error.js'
import { useTheming } from '@/store/state'
import { DEFAULT_FEATURE_FLAGS, type FeatureFlag } from '@/store/theme.ts'

import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const themeStore = useTheming()
const { formatMessage } = useVIntl()
const { addNotification } = injectNotificationManager()
const isDevEnvironment = await isDev()
const previewMinecraftCrashModal = inject<() => void>('previewMinecraftCrashModal')
const messages = defineMessages({
	resetToDefault: {
		id: 'app.settings.feature-flags.reset-to-default',
		defaultMessage: 'Reset to default',
	},
	developerTools: {
		id: 'app.settings.about.developer-tools',
		defaultMessage: 'Developer tools',
	},
	testError: {
		id: 'app.settings.about.test-error',
		defaultMessage: 'Trigger test error',
	},
	testErrorMessage: {
		id: 'app.settings.about.test-error-message',
		defaultMessage: 'Test error triggered from the development settings.',
	},
	testNotificationError: {
		id: 'app.settings.about.test-notification-error',
		defaultMessage: 'Trigger notification test error',
	},
	testNotificationErrorTitle: {
		id: 'app.settings.about.test-notification-error-title',
		defaultMessage: 'Test notification error',
	},
	previewMinecraftCrashModal: {
		id: 'app.settings.about.preview-minecraft-crash-modal',
		defaultMessage: 'Preview Minecraft crash window',
	},
})

const featureFlagLabels: Record<FeatureFlag, string> = {
	project_background: '项目背景',
	page_path: '页面路径',
	worlds_tab: '世界标签页',
	worlds_in_home: '主页显示世界',
	server_project_qa: '服务器项目问答',
	show_version_environment_column: '显示版本环境列',
	server_ram_as_bytes_always_on: '服务器内存始终按字节显示',
	always_show_app_controls: '始终显示窗口控件',
	skip_non_essential_warnings: '跳过非必要警告',
	skip_unknown_pack_warning: '跳过未知整合包警告',
	i18n_debug: '国际化调试',
	show_instance_play_time: '显示实例游玩时间',
	page_transitions: '页面切换动画',
	advanced_filters_collapsed: '高级筛选默认折叠',
	multiplayer_in_app: '多人联机',
	auto_install_dependencies: '自动安装依赖',
	force_anniversary_celebration: '强制显示周年庆庆祝（调试）',
}

const settings = ref(await getSettings())
const options = ref<FeatureFlag[]>(Object.keys(DEFAULT_FEATURE_FLAGS))

function setFeatureFlag(key: string, value: boolean) {
	themeStore.featureFlags[key] = value
	settings.value.feature_flags[key] = value
}

function triggerTestError() {
	handleSevereError(new Error(formatMessage(messages.testErrorMessage)))
}

function triggerTestNotificationError() {
	addNotification({
		title: formatMessage(messages.testNotificationErrorTitle),
		text: formatMessage(messages.testErrorMessage),
		type: 'error',
	})
}

watch(
	settings,
	async () => {
		await setSettings(settings.value)
	},
	{ deep: true },
)
</script>
<template>
	<SettingsSection>
		<SettingsRow v-for="option in options" :key="option">
			<template #label>{{ featureFlagLabels[option] ?? option }}</template>
			<template #control>
				<div class="flex items-center gap-2">
					<Button
						type="quiet"
						:disabled="themeStore.getFeatureFlag(option) === DEFAULT_FEATURE_FLAGS[option]"
						@click="setFeatureFlag(option, DEFAULT_FEATURE_FLAGS[option])"
					>
						{{ formatMessage(messages.resetToDefault) }}
					</Button>
					<Toggle
						:id="`feature-flag-${option}`"
						:model-value="themeStore.getFeatureFlag(option)"
						@update:model-value="() => setFeatureFlag(option, !themeStore.getFeatureFlag(option))"
					/>
				</div>
			</template>
		</SettingsRow>
	</SettingsSection>

	<SettingsSection v-if="isDevEnvironment">
		<template #header>
			<h2 class="m-0 flex items-center gap-2 text-lg font-semibold text-contrast">
				<WrenchIcon class="size-5 text-secondary" />
				{{ formatMessage(messages.developerTools) }}
			</h2>
		</template>
		<div class="flex flex-wrap gap-2 p-4">
			<Button type="base" @click="triggerTestError">
				<WrenchIcon /> {{ formatMessage(messages.testError) }}
			</Button>
			<Button type="base" @click="triggerTestNotificationError">
				<WrenchIcon /> {{ formatMessage(messages.testNotificationError) }}
			</Button>
			<Button type="base" @click="previewMinecraftCrashModal?.()">
				<WrenchIcon /> {{ formatMessage(messages.previewMinecraftCrashModal) }}
			</Button>
		</div>
	</SettingsSection>
</template>