<script setup lang="ts">
import { ExternalIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { openUrl } from '@tauri-apps/plugin-opener'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const messages = defineMessages({
	widgetTitle: { id: 'app.home.skin-site.title', defaultMessage: 'StarLight skin site' },
	luckyIndex: { id: 'app.home.skin-site.lucky-index', defaultMessage: 'Lucky index' },
	jump: { id: 'app.home.skin-site.jump', defaultMessage: 'Jump to StarLight skin site' },
})

const SKIN_PROFILE_URL = 'https://skin.starlight.cool/profile'
const SKIN_HOME_URL = 'https://skin.starlight.cool/'

async function openProfile() {
	try {
		await openUrl(SKIN_PROFILE_URL)
	} catch (error) {
		handleError(error)
	}
}

async function openSkinSite() {
	try {
		await openUrl(SKIN_HOME_URL)
	} catch (error) {
		handleError(error)
	}
}
</script>

<template>
	<section class="flex min-w-0 flex-col gap-3 border-0 border-b-[1px] border-solid border-[--brand-gradient-border] p-4">
		<div class="flex items-center gap-2">
			<ExternalIcon class="size-4 shrink-0 text-secondary" aria-hidden="true" />
			<h2 class="m-0 truncate text-lg">
				{{ formatMessage(messages.widgetTitle) }}
			</h2>
		</div>

		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[--brand-gradient-border] bg-transparent px-3 py-2 text-left transition-colors hover:bg-button-bg"
				@click="openProfile"
			>
				<span class="text-sm font-semibold text-contrast">
					{{ formatMessage(messages.luckyIndex) }}
				</span>
				<ExternalIcon class="size-4 shrink-0 text-secondary" aria-hidden="true" />
			</button>

			<button
				type="button"
				class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[--brand-gradient] px-3 py-2 font-semibold text-[var(--color-contrast)] transition-opacity hover:opacity-90"
				@click="openSkinSite"
			>
				<ExternalIcon class="size-4 shrink-0" aria-hidden="true" />
				<span>{{ formatMessage(messages.jump) }}</span>
			</button>
		</div>
	</section>
</template>
