<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import {
	receiveSkinSiteMessage,
	resetSkinSiteSession,
	setSkinSiteFrame,
	SKIN_SITE_ORIGIN,
	skinSiteStatus,
	skinSiteUser,
} from '@/composables/skin-site-session'
import { clearHostedSession } from '@/helpers/hosted-packs'

const frame = ref<HTMLIFrameElement>()
let lastMessage = 0
let expiryTimer: ReturnType<typeof setInterval> | undefined

watch(
	[skinSiteStatus, () => skinSiteUser.value?.uuid],
	() => {
		void clearHostedSession().catch(() => {})
	},
	{ flush: 'sync' },
)

function connect() {
	resetSkinSiteSession()
	lastMessage = 0
	const contentWindow = frame.value?.contentWindow ?? null
	setSkinSiteFrame(contentWindow)
	contentWindow?.postMessage({ type: 'starlight-skin-session-connect' }, SKIN_SITE_ORIGIN)
}

function receive(event: MessageEvent) {
	if (receiveSkinSiteMessage(event, frame.value?.contentWindow ?? null)) lastMessage = Date.now()
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
	setSkinSiteFrame(null)
	resetSkinSiteSession()
	void clearHostedSession().catch(() => {})
})
</script>

<template>
	<iframe
		ref="frame"
		:src="`${SKIN_SITE_ORIGIN}/`"
		title="StarLight Skin Site session"
		aria-hidden="true"
		tabindex="-1"
		class="pointer-events-none fixed -left-[10000px] top-0 h-px w-px opacity-0"
		@load="connect"
	/>
</template>
