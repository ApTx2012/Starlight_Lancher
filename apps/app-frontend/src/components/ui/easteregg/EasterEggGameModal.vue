
<script setup lang="ts">
import { defineMessages, NewModal, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

import AboutEasterEgg from '../AboutEasterEgg.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: {
		id: 'app.settings.about.easteregg.game-title',
		defaultMessage: 'Mini Game',
	},
})

const modal = ref<InstanceType<typeof NewModal> | null>(null)
const gameVisible = ref(false)

function show() {
	gameVisible.value = true
	modal.value?.show()
}

function onHide() {
	gameVisible.value = false
}

function closeGame() {
	modal.value?.hide()
}

defineExpose({ show })
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.title)"
		width="min(832px, calc(100vw - 2rem))"
		max-width="832px"
		noblur
		:on-hide="onHide"
	>
		<div class="relative h-[600px] w-[800px] max-w-full overflow-hidden rounded-xl bg-surface-1">
			<AboutEasterEgg v-if="gameVisible" @exit="closeGame" />
		</div>
	</NewModal>
</template>
