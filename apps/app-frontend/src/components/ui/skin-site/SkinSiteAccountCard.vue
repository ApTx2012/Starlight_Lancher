<script setup lang="ts">
import { SparklesIcon, SpinnerIcon } from '@modrinth/assets'
import { Avatar, ButtonStyled, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref, watch } from 'vue'

import {
	requestSkinSiteLuck,
	skinSitePlayers,
	skinSitePlayersStatus,
	skinSiteStatus,
	skinSiteUser,
} from '@/composables/skin-site-session'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	signedOutTitle: { id: 'app.skin-site.home.signed-out-title', defaultMessage: 'Not signed in' },
	signedOutBody: {
		id: 'app.skin-site.home.signed-out-body',
		defaultMessage: 'Sign in to the StarLight skin site to manage players and download packs.',
	},
	players: { id: 'app.skin-site.home.players', defaultMessage: 'Your players' },
	noPlayers: {
		id: 'app.skin-site.home.no-players',
		defaultMessage: 'No players yet. Add one on the skin site.',
	},
	luck: { id: 'app.skin-site.home.luck', defaultMessage: "Today's luck" },
	luckUnavailable: { id: 'app.skin-site.home.luck-unavailable', defaultMessage: 'Unavailable' },
	loading: { id: 'app.skin-site.home.loading', defaultMessage: 'Loading…' },
	error: { id: 'app.skin-site.home.error', defaultMessage: 'Could not load players.' },
	signIn: { id: 'app.skin-site.home.sign-in', defaultMessage: 'Sign in' },
})

const emit = defineEmits<{ (e: 'sign-in'): void }>()

const luck = ref<number | null>(null)
const luckLoading = ref(false)

const signedIn = computed(() => skinSiteStatus.value === 'signed-in' && !!skinSiteUser.value)
const players = computed(() => skinSitePlayers.value)
const playersLoading = computed(
	() => skinSitePlayersStatus.value === 'checking' || skinSitePlayersStatus.value === 'idle',
)
const playersError = computed(() => skinSitePlayersStatus.value === 'error')

async function loadLuck() {
	if (!signedIn.value) {
		luck.value = null
		return
	}
	luckLoading.value = true
	try {
		luck.value = await requestSkinSiteLuck()
	} catch {
		luck.value = null
	} finally {
		luckLoading.value = false
	}
}

onMounted(loadLuck)
watch(signedIn, loadLuck)
</script>

<template>
	<div
		class="flex flex-col gap-4 rounded-2xl border border-solid border-surface-5 bg-bg-raised p-4"
	>
		<div v-if="!signedIn" class="flex flex-col items-start gap-2">
			<h3 class="m-0 text-base font-semibold text-contrast">
				{{ formatMessage(messages.signedOutTitle) }}
			</h3>
			<p class="m-0 text-sm text-secondary">{{ formatMessage(messages.signedOutBody) }}</p>
			<ButtonStyled color="brand">
				<button type="button" @click="emit('sign-in')">
					{{ formatMessage(messages.signIn) }}
				</button>
			</ButtonStyled>
		</div>

		<template v-else>
			<div class="flex items-center gap-3">
				<div
					class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-highlight text-lg font-bold text-contrast"
				>
					{{ skinSiteUser!.username.slice(0, 1).toUpperCase() }}
				</div>
				<div class="flex min-w-0 flex-col">
					<span class="truncate font-semibold text-contrast">{{ skinSiteUser!.username }}</span>
					<span class="truncate text-xs text-secondary">{{ skinSiteUser!.uuid }}</span>
				</div>
				<div
					class="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-sm"
					:title="formatMessage(messages.luck)"
				>
					<SpinnerIcon v-if="luckLoading" class="size-4 animate-spin" />
					<template v-else-if="luck !== null">
						<SparklesIcon class="size-4 text-brand" />
						<span class="font-semibold text-contrast">{{ luck }}</span>
					</template>
					<span v-else class="text-xs text-secondary">{{
						formatMessage(messages.luckUnavailable)
					}}</span>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-semibold text-contrast">{{
					formatMessage(messages.players)
				}}</span>

				<div v-if="playersLoading" class="flex items-center gap-2 text-sm text-secondary">
					<SpinnerIcon class="size-4 animate-spin" />
					{{ formatMessage(messages.loading) }}
				</div>
				<p v-else-if="playersError" class="m-0 text-sm text-red">
					{{ formatMessage(messages.error) }}
				</p>
				<p v-else-if="!players.length" class="m-0 text-sm text-secondary">
					{{ formatMessage(messages.noPlayers) }}
				</p>
				<div v-else class="flex flex-wrap gap-3">
					<div
						v-for="player in players"
						:key="player.uuid"
						class="flex items-center gap-2 rounded-xl bg-button-bg px-2 py-1.5"
					>
						<Avatar
							:src="player.headDataUrl"
							:alt="player.name"
							size="2rem"
							pixelated
							class="!rounded-md"
						/>
						<div class="flex flex-col">
							<span class="text-sm font-medium text-contrast">{{ player.name }}</span>
							<span v-if="player.isMojang" class="text-[10px] uppercase text-secondary"
								>Mojang</span
							>
						</div>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>
