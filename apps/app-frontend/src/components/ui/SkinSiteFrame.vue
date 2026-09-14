<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'

import { skinSiteFrameUrl } from '@/composables/skin-site-session'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	frameTitle: {
		id: 'app.starlight-skin.frame-title',
		defaultMessage: 'StarLight Skin Site',
	},
})

</script>

<template>
	<iframe
		:src="skinSiteFrameUrl"
		:title="formatMessage(messages.frameTitle)"
		class="block h-full min-h-0 w-full border-0"
	/>
</template>
