<script setup lang="ts">
import { CopyIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

import SkinSiteAccountCard from './SkinSiteAccountCard.vue'
import SkinSiteAnnouncements from './SkinSiteAnnouncements.vue'
import SkinSiteBugListView from './SkinSiteBugListView.vue'
import SkinSiteDonationCard from './SkinSiteDonationCard.vue'
import SkinSiteDownloadsView from './SkinSiteDownloadsView.vue'
import SkinSiteLoginModal from './SkinSiteLoginModal.vue'
import SkinSiteMapView from './SkinSiteMapView.vue'
import SkinSiteNavCards from './SkinSiteNavCards.vue'
import SkinSiteProfileModal from './SkinSiteProfileModal.vue'
import SkinSiteProfileView from './SkinSiteProfileView.vue'
import SkinSiteReviewView from './SkinSiteReviewView.vue'

const { formatMessage } = useVIntl()
const { addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.home.title', defaultMessage: 'StarLight Skin Site' },
	subtitle: {
		id: 'app.skin-site.home.subtitle',
		defaultMessage: 'The wardrobe for StarLight Server players.',
	},
	address: { id: 'app.skin-site.home.address', defaultMessage: 'Skin site address' },
	copied: { id: 'app.skin-site.home.copied', defaultMessage: 'Address copied.' },
})

const YGGDRASIL_URL = 'https://skin.starlight.cool/yggdrasil'
const loginModal = ref<InstanceType<typeof SkinSiteLoginModal>>()
const profileModal = ref<InstanceType<typeof SkinSiteProfileModal>>()
const view = ref<'home' | 'players' | 'downloads' | 'map' | 'review' | 'bugs'>('home')

async function copyAddress() {
	try {
		await navigator.clipboard.writeText(YGGDRASIL_URL)
		addNotification({ type: 'success', title: formatMessage(messages.copied) })
	} catch {
		// Clipboard may be unavailable; the address stays selectable.
	}
}
</script>

<template>
	<div class="flex h-full min-h-0 w-full flex-col overflow-y-auto">
		<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
			<SkinSiteProfileView v-if="view === 'players'" @back="view = 'home'" />
			<SkinSiteDownloadsView v-else-if="view === 'downloads'" @back="view = 'home'" />
			<SkinSiteMapView v-else-if="view === 'map'" @back="view = 'home'" />
			<SkinSiteReviewView v-else-if="view === 'review'" @back="view = 'home'" />
			<SkinSiteBugListView v-else-if="view === 'bugs'" @back="view = 'home'" />

			<template v-else>
				<header class="flex flex-col items-center gap-1 text-center">
					<h1 class="m-0 text-2xl font-bold text-contrast">{{ formatMessage(messages.title) }}</h1>
					<p class="m-0 text-sm text-secondary">{{ formatMessage(messages.subtitle) }}</p>
				</header>

				<SkinSiteAccountCard
					@sign-in="loginModal?.show()"
					@open-settings="profileModal?.show()"
					@open-players="view = 'players'"
				/>

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<SkinSiteNavCards @navigate="(v) => (view = v)" />
					<SkinSiteAnnouncements />
				</div>

				<SkinSiteDonationCard />

				<div
					class="flex flex-wrap items-center gap-2 rounded-xl border border-solid border-surface-5 bg-bg-raised px-4 py-3"
				>
					<span class="text-sm font-semibold text-contrast">{{
						formatMessage(messages.address)
					}}</span>
					<code class="min-w-0 flex-1 truncate text-xs text-secondary">{{ YGGDRASIL_URL }}</code>
					<button
						type="button"
						class="flex shrink-0 items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="copyAddress"
					>
						<CopyIcon class="size-3.5" />
						{{ formatMessage({ id: 'app.skin-site.home.copy', defaultMessage: 'Copy' }) }}
					</button>
				</div>
			</template>
		</div>

		<SkinSiteLoginModal ref="loginModal" />
		<SkinSiteProfileModal ref="profileModal" />
	</div>
</template>
