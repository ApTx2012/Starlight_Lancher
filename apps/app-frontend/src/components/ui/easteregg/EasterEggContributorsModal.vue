
<script setup lang="ts">
import { Avatar, defineMessages, NewModal, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

const emit = defineEmits<{
	openGame: []
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: {
		id: 'app.settings.about.easteregg.contributors-title',
		defaultMessage: '贡献者彩蛋',
	},
	clickHint: {
		id: 'app.settings.about.easteregg.click-hint',
		defaultMessage: 'Click to open a hidden Easter egg',
	},
})

const modal = ref<InstanceType<typeof NewModal> | null>(null)

// 贡献者列表占位。原彩蛋的硬编码项已移除，若要恢复，按下面结构补充即可：
// { name: '某某', avatarUrl: 'https://...' }
const contributors: { name: string; avatarUrl: string }[] = []

function show() {
	modal.value?.show()
}

function selectContributor() {
	modal.value?.hide()
	emit('openGame')
}

defineExpose({ show })
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.title)"
		width="min(480px, calc(100vw - 2rem))"
		max-width="480px"
	>
		<ul v-if="contributors.length" class="m-0 list-none p-0">
			<li v-for="contributor in contributors" :key="contributor.name">
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-xl bg-surface-4 p-4 text-left transition-colors hover:bg-surface-5"
					@click="selectContributor"
				>
					<Avatar :src="contributor.avatarUrl" :alt="contributor.name" size="4rem" circle no-shadow />
					<span class="min-w-0">
						<span class="block font-semibold text-contrast">{{ contributor.name }}</span>
						<span class="block text-sm text-secondary">
							{{ formatMessage(messages.clickHint) }}
						</span>
					</span>
				</button>
			</li>
		</ul>
	</NewModal>
</template>
