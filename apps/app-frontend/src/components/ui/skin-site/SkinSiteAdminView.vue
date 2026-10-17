<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, ref } from 'vue'

import { skinSiteUser } from '@/composables/skin-site-session'

import AdminBroadcastPage from './admin/AdminBroadcastPage.vue'
import AdminSummaryPage from './admin/AdminSummaryPage.vue'

const emit = defineEmits<{ (e: 'back'): void }>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: { id: 'app.skin-site.admin.title', defaultMessage: 'Admin console' },
	back: { id: 'app.skin-site.admin.back', defaultMessage: 'Back to home' },
	noAccess: { id: 'app.skin-site.admin.no-access', defaultMessage: 'You do not have access.' },
	noAccessHint: {
		id: 'app.skin-site.admin.no-access-hint',
		defaultMessage: 'Sign in with an administrator account to use this console.',
	},
	groupSecurity: { id: 'app.skin-site.admin.group.security', defaultMessage: 'Security' },
	groupUsers: { id: 'app.skin-site.admin.group.users', defaultMessage: 'Users' },
	groupCommunity: { id: 'app.skin-site.admin.group.community', defaultMessage: 'Community' },
	groupResources: { id: 'app.skin-site.admin.group.resources', defaultMessage: 'Resources' },
	itemServers: { id: 'app.skin-site.admin.item.servers', defaultMessage: 'Servers' },
	itemSummary: { id: 'app.skin-site.admin.item.summary', defaultMessage: 'Summary' },
	itemAccessAudit: { id: 'app.skin-site.admin.item.access-audit', defaultMessage: 'Access audit' },
	itemUsers: { id: 'app.skin-site.admin.item.users', defaultMessage: 'Users' },
	itemPlayers: { id: 'app.skin-site.admin.item.players', defaultMessage: 'Players' },
	itemReview: { id: 'app.skin-site.admin.item.review', defaultMessage: 'Player review' },
	itemBroadcast: { id: 'app.skin-site.admin.item.broadcast', defaultMessage: 'Broadcast' },
	itemChat: { id: 'app.skin-site.admin.item.chat', defaultMessage: 'Chat rooms' },
	itemWiki: { id: 'app.skin-site.admin.item.wiki', defaultMessage: 'Wiki' },
	itemDonations: { id: 'app.skin-site.admin.item.donations', defaultMessage: 'Donations' },
	itemMods: { id: 'app.skin-site.admin.item.mods', defaultMessage: 'Mods' },
	itemLauncher: { id: 'app.skin-site.admin.item.launcher', defaultMessage: 'Launcher' },
	itemDownloads: { id: 'app.skin-site.admin.item.downloads', defaultMessage: 'Downloads' },
})

type AdminKey =
	| 'servers'
	| 'summary'
	| 'access-audit'
	| 'users'
	| 'players'
	| 'review'
	| 'broadcast'
	| 'chat'
	| 'wiki'
	| 'donations'
	| 'mods'
	| 'launcher'
	| 'downloads'

interface NavItem {
	key: AdminKey
	label: string
}
interface NavGroup {
	id: string
	label: string
	items: NavItem[]
}

const navGroups = computed<NavGroup[]>(() => [
	{
		id: 'security',
		label: formatMessage(messages.groupSecurity),
		items: [
			{ key: 'servers', label: formatMessage(messages.itemServers) },
			{ key: 'summary', label: formatMessage(messages.itemSummary) },
			{ key: 'access-audit', label: formatMessage(messages.itemAccessAudit) },
		],
	},
	{
		id: 'users',
		label: formatMessage(messages.groupUsers),
		items: [
			{ key: 'users', label: formatMessage(messages.itemUsers) },
			{ key: 'players', label: formatMessage(messages.itemPlayers) },
			{ key: 'review', label: formatMessage(messages.itemReview) },
		],
	},
	{
		id: 'community',
		label: formatMessage(messages.groupCommunity),
		items: [
			{ key: 'broadcast', label: formatMessage(messages.itemBroadcast) },
			{ key: 'chat', label: formatMessage(messages.itemChat) },
			{ key: 'wiki', label: formatMessage(messages.itemWiki) },
			{ key: 'donations', label: formatMessage(messages.itemDonations) },
		],
	},
	{
		id: 'resources',
		label: formatMessage(messages.groupResources),
		items: [
			{ key: 'mods', label: formatMessage(messages.itemMods) },
			{ key: 'launcher', label: formatMessage(messages.itemLauncher) },
			{ key: 'downloads', label: formatMessage(messages.itemDownloads) },
		],
	},
])

const hasAdminAccess = computed(() => {
	const permissions = skinSiteUser.value?.permissions ?? []
	return permissions.includes('WEB_ADMIN') || permissions.includes('SERVER_ADMIN')
})

const current = ref<AdminKey>('summary')
</script>
<template>
	<div class="flex h-full min-h-0 flex-col gap-4">
		<button
			type="button"
			class="flex w-fit items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
			@click="emit('back')"
		>
			← {{ formatMessage(messages.back) }}
		</button>

		<div
			v-if="!hasAdminAccess"
			class="flex flex-col gap-1 rounded-xl border border-solid border-surface-5 bg-bg-raised p-6"
		>
			<h2 class="m-0 text-lg font-bold text-contrast">{{ formatMessage(messages.noAccess) }}</h2>
			<p class="m-0 text-sm text-secondary">{{ formatMessage(messages.noAccessHint) }}</p>
		</div>

		<div v-else class="flex min-h-0 flex-1 gap-4">
			<nav class="flex w-48 shrink-0 flex-col gap-3 overflow-y-auto">
				<div v-for="group in navGroups" :key="group.id" class="flex flex-col gap-1">
					<span class="px-2 text-[10px] font-bold tracking-wide text-secondary uppercase">
						{{ group.label }}
					</span>
					<button
						v-for="item in group.items"
						:key="item.key"
						type="button"
						class="rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors"
						:class="
							current === item.key
								? 'bg-brand text-contrast'
								: 'text-secondary hover:bg-button-bg hover:text-contrast'
						"
						@click="current = item.key"
					>
						{{ item.label }}
					</button>
				</div>
			</nav>

			<section
				class="min-w-0 flex-1 overflow-y-auto rounded-xl border border-solid border-surface-5 bg-bg-raised p-4"
			>
				<AdminSummaryPage v-if="current === 'summary'" />
				<AdminBroadcastPage v-else-if="current === 'broadcast'" />
				<p v-else class="m-0 text-sm text-secondary">{{ current }}</p>
			</section>
		</div>
	</div>
</template>
