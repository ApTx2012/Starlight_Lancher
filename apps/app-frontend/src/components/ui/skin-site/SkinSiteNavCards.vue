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
import { computed } from 'vue'

import SkinSiteSelectionRail from './SkinSiteSelectionRail.vue'

defineProps<{ active: string }>()

const { formatMessage } = useVIntl()

const emit = defineEmits<{
	(e: 'navigate', view: 'downloads' | 'review' | 'bugs' | 'map' | 'wiki' | 'players'): void
}>()

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

const destinations = ['downloads', 'review', 'wiki', 'bugs', 'map', 'players'] as const
const items = computed(() => [
	{
		id: 'downloads',
		label: formatMessage(messages.download),
		description: formatMessage(messages.downloadDesc),
		icon: DownloadIcon,
	},
	{
		id: 'review',
		label: formatMessage(messages.review),
		description: formatMessage(messages.reviewDesc),
		icon: ShieldCheckIcon,
	},
	{
		id: 'wiki',
		label: formatMessage(messages.wiki),
		description: formatMessage(messages.wikiDesc),
		icon: BookIcon,
	},
	{
		id: 'bugs',
		label: formatMessage(messages.bugs),
		description: formatMessage(messages.bugsDesc),
		icon: BugIcon,
	},
	{
		id: 'map',
		label: formatMessage(messages.map),
		description: formatMessage(messages.mapDesc),
		icon: MapIcon,
	},
	{
		id: 'players',
		label: formatMessage(messages.profile),
		description: formatMessage(messages.profileDesc),
		icon: UserIcon,
	},
])
function navigate(id: string) {
	const destination = destinations.find((value) => value === id)
	if (destination) emit('navigate', destination)
}
</script>

<template>
	<SkinSiteSelectionRail
		:items="items"
		:selected="active"
		:label="formatMessage(messages.title)"
		@select="navigate"
	/>
</template>
