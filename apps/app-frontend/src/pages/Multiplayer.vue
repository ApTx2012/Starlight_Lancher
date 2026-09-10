<script setup lang="ts">
import { UsersIcon } from '@modrinth/assets'
import { defineMessages, NavTabs, useVIntl } from '@modrinth/ui'
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

const { formatMessage } = useVIntl()
const route = useRoute()
const router = useRouter()

const messages = defineMessages({
	title: { id: 'app.multiplayer.title', defaultMessage: 'Multiplayer' },
	roomsTab: { id: 'app.multiplayer.tab.rooms', defaultMessage: 'Rooms' },
})

const activeTab = computed(() => (route.path.startsWith('/multiplayer/rooms') ? 'rooms' : 'rooms'))
const tabLinks = computed(() => [
	{ label: formatMessage(messages.roomsTab), href: '/multiplayer/rooms', icon: UsersIcon },
])

function handleTabClick(index: number) {
	void router.push(tabLinks.value[index]?.href ?? '/multiplayer/rooms')
}
</script>

<template>
	<div class="box-border flex min-h-full w-full flex-col gap-3 p-6">
		<h1 class="m-0 shrink-0 text-2xl font-semibold text-contrast">
			{{ formatMessage(messages.title) }}
		</h1>
		<NavTabs mode="local" :active-index="0" :links="tabLinks" @tab-click="handleTabClick" />

		<RouterView />
	</div>
</template>
