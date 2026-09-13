<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, onUnmounted, ref } from 'vue'

import {
	receiveSkinSiteSession,
	resetSkinSiteSession,
	SKIN_SITE_ORIGIN,
	skinSiteFrameUrl,
} from '@/composables/skin-site-session'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	frameTitle: {
		id: 'app.starlight-skin.frame-title',
		defaultMessage: 'StarLight Skin Site',
	},
})

const frame = ref<HTMLIFrameElement>()
let lastMessage = 0
let expiryTimer: ReturnType<typeof setInterval> | undefined

function connect() {
	frame.value?.contentWindow?.postMessage(
		{ type: 'starlight-skin-session-connect' },
		SKIN_SITE_ORIGIN,
	)
}

function receive(event: MessageEvent) {
	if (receiveSkinSiteSession(event, frame.value?.contentWindow ?? null)) lastMessage = Date.now()
}

onMounted(() => {
	window.addEventListener('message', receive)
	connect()
	expiryTimer = setInterval(() => {
		if (lastMessage && Date.now() - lastMessage > 90_000) resetSkinSiteSession()
	}, 10_000)
})

onUnmounted(() => {
	window.removeEventListener('message', receive)
	clearInterval(expiryTimer)
	resetSkinSiteSession()
})
</script>

<template>
	<iframe
		ref="frame"
		:src="skinSiteFrameUrl"
		:title="formatMessage(messages.frameTitle)"
		class="block h-full min-h-0 w-full border-0"
		@load="connect"
	/>
</template>
