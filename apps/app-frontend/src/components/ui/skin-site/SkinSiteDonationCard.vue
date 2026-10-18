<script setup lang="ts">
import { HeartIcon, SpinnerIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	type SkinSitePublicDonationSummary,
	skinSitePublicDonationSummary,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: { id: 'app.skin-site.home.donation.title', defaultMessage: 'Donation thanks' },
	total: { id: 'app.skin-site.home.donation.total', defaultMessage: 'Total raised' },
	donors: { id: 'app.skin-site.home.donation.donors', defaultMessage: '{count} donors' },
	unavailable: {
		id: 'app.skin-site.home.donation.unavailable',
		defaultMessage: 'Donation summary unavailable.',
	},
	loading: { id: 'app.skin-site.home.donation.loading', defaultMessage: 'Loading…' },
})

const summary = ref<SkinSitePublicDonationSummary | null>(null)
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
	try {
		const result = await skinSitePublicDonationSummary()
		if (result.success) summary.value = result.payload
		else failed.value = true
	} catch {
		failed.value = true
	} finally {
		loading.value = false
	}
})
</script>

<template>
	<div
		class="flex items-center gap-3 rounded-xl border border-solid border-surface-5 bg-bg-raised px-4 py-3"
	>
		<HeartIcon class="size-5 shrink-0 text-brand" />
		<div class="flex min-w-0 flex-1 flex-col">
			<span class="text-sm font-semibold text-contrast">{{ formatMessage(messages.title) }}</span>
			<span v-if="loading" class="flex items-center gap-1 text-xs text-secondary">
				<SpinnerIcon class="size-3 animate-spin" />
				{{ formatMessage(messages.loading) }}
			</span>
			<span v-else-if="failed" class="text-xs text-secondary">
				{{ formatMessage(messages.unavailable) }}
			</span>
			<span v-else-if="summary" class="text-xs text-secondary">
				{{ formatMessage(messages.total) }}: {{ summary.totalAmount }} ·
				{{ formatMessage(messages.donors, { count: summary.donorCount }) }}
			</span>
		</div>
	</div>
</template>
