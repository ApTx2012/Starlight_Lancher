<script setup lang="ts">
import {
	BookIcon,
	BugIcon,
	DownloadIcon,
	MapIcon,
	ShieldCheckIcon,
	UserIcon,
} from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import type { Component } from 'vue'

const { formatMessage } = useVIntl()

const emit = defineEmits<{ (e: 'navigate', view: 'downloads' | 'review' | 'bugs'): void }>()

const messages = defineMessages({
	title: { id: 'app.skin-site.home.nav.title', defaultMessage: 'Skin site' },
	download: { id: 'app.skin-site.home.nav.download', defaultMessage: 'Downloads' },
	downloadDesc: {
		id: 'app.skin-site.home.nav.download-desc',
		defaultMessage: 'Browse files shared by the server.',
	},
	review: { id: 'app.skin-site.home.nav.review', defaultMessage: 'Player review' },
	reviewDesc: {
		id: 'app.skin-site.home.nav.review-desc',
		defaultMessage: 'Submit and review player applications.',
	},
	wiki: { id: 'app.skin-site.home.nav.wiki', defaultMessage: 'Server wiki' },
	wikiDesc: {
		id: 'app.skin-site.home.nav.wiki-desc',
		defaultMessage: 'Guides and documentation for the server.',
	},
	bugs: { id: 'app.skin-site.home.nav.bugs', defaultMessage: 'Bug tracker' },
	bugsDesc: {
		id: 'app.skin-site.home.nav.bugs-desc',
		defaultMessage: 'Report issues and follow their progress.',
	},
	map: { id: 'app.skin-site.home.nav.map', defaultMessage: 'Server map' },
	mapDesc: {
		id: 'app.skin-site.home.nav.map-desc',
		defaultMessage: 'Explore the live world map.',
	},
	profile: { id: 'app.skin-site.home.nav.profile', defaultMessage: 'Profile' },
	profileDesc: {
		id: 'app.skin-site.home.nav.profile-desc',
		defaultMessage: 'Manage your account and textures.',
	},
})

interface NavItem {
	id: string
	title: string
	description: string
	icon: Component
	href: string
}

const SKIN_SITE = 'https://skin.starlight.cool'

const items: NavItem[] = [
	{
		id: 'download',
		title: formatMessage(messages.download),
		description: formatMessage(messages.downloadDesc),
		icon: DownloadIcon,
		href: `${SKIN_SITE}/download`,
	},
	{
		id: 'review',
		title: formatMessage(messages.review),
		description: formatMessage(messages.reviewDesc),
		icon: ShieldCheckIcon,
		href: `${SKIN_SITE}/review`,
	},
	{
		id: 'wiki',
		title: formatMessage(messages.wiki),
		description: formatMessage(messages.wikiDesc),
		icon: BookIcon,
		href: `${SKIN_SITE}/wiki`,
	},
	{
		id: 'bugs',
		title: formatMessage(messages.bugs),
		description: formatMessage(messages.bugsDesc),
		icon: BugIcon,
		href: `${SKIN_SITE}/bugs`,
	},
	{
		id: 'map',
		title: formatMessage(messages.map),
		description: formatMessage(messages.mapDesc),
		icon: MapIcon,
		href: `${SKIN_SITE}/map`,
	},
	{
		id: 'profile',
		title: formatMessage(messages.profile),
		description: formatMessage(messages.profileDesc),
		icon: UserIcon,
		href: `${SKIN_SITE}/profile`,
	},
]

function open(item: NavItem) {
	if (item.id === 'download' || item.id === 'review' || item.id === 'bugs') {
		emit('navigate', item.id === 'download' ? 'downloads' : item.id)
		return
	}
	void import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(item.href))
}
</script>

<template>
	<div class="flex flex-col gap-3">
		<h3 class="m-0 text-base font-semibold text-contrast">{{ formatMessage(messages.title) }}</h3>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			<button
				v-for="item in items"
				:key="item.id"
				type="button"
				class="flex flex-col items-start gap-1 rounded-xl border border-solid border-surface-5 bg-bg-raised p-3 text-left transition-colors hover:bg-button-bg"
				@click="open(item)"
			>
				<component :is="item.icon" class="size-5 text-brand" />
				<span class="text-sm font-semibold text-contrast">{{ item.title }}</span>
				<span class="text-xs text-secondary">{{ item.description }}</span>
			</button>
		</div>
	</div>
</template>
