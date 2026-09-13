
<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: {
		id: 'app.starlight-skin.title',
		defaultMessage: '斯达莱特',
	},
	frameTitle: {
		id: 'app.starlight-skin.frame-title',
		defaultMessage: 'StarLight Skin Site',
	},
})

const SKIN_SITE_URL = 'https://skin.starlight.cool/'

const loading = ref(true)

function onLoad() {
	loading.value = false
}
</script>

<template>
	<div class="flex h-full min-h-0 flex-col">
		<div v-if="loading" class="flex flex-1 items-center justify-center">
			<span class="text-secondary">{{ formatMessage(messages.title) }}…</span>
		</div>
		<iframe
			:src="SKIN_SITE_URL"
			:title="formatMessage(messages.frameTitle)"
			class="h-full min-h-0 w-full flex-1 border-0"
			:class="loading ? 'hidden' : ''"
			@load="onLoad"
		/>
	</div>
</template>
