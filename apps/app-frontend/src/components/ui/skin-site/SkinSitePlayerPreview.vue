<script setup lang="ts">
import { RefreshCwIcon, SpinnerIcon, UserIcon } from '@modrinth/assets'
import { commonMessages, defineMessages, useVIntl } from '@modrinth/ui'
import SkinPreviewRenderer from '@modrinth/ui/src/components/skin/SkinPreviewRenderer.vue'
import type { Ref } from 'vue'
import { computed, inject, onUnmounted, ref, watch } from 'vue'

import type AccountsCard from '@/components/ui/AccountsCard.vue'
import {
	requestSkinSitePlayers,
	selectedSkinSitePlayerId,
	skinSitePlayers,
	skinSitePlayersStatus,
	skinSiteStatus,
} from '@/composables/skin-site-session'
import { get_normalized_skin_texture } from '@/helpers/skins'

import SkinSiteSelectionRail from './SkinSiteSelectionRail.vue'

const { formatMessage } = useVIntl()
const accountsCard = inject<Ref<InstanceType<typeof AccountsCard> | undefined>>('accountsCard')
const pendingId = ref<string | null>(null)
const messages = defineMessages({
	players: { id: 'app.skin-site.home.preview.players', defaultMessage: 'Players' },
	empty: { id: 'app.skin-site.home.preview.empty', defaultMessage: 'No players yet' },
	emptyHint: {
		id: 'app.skin-site.home.preview.empty-hint',
		defaultMessage: 'Sign in or add a Minecraft account in the sidebar to see your skin here.',
	},
	unavailable: {
		id: 'app.skin-site.home.preview.unavailable',
		defaultMessage: 'This player has no skin to preview.',
	},
	loading: { id: 'app.skin-site.home.preview.loading', defaultMessage: 'Loading players…' },
	failed: {
		id: 'app.skin-site.home.preview.failed',
		defaultMessage: 'Could not load skin-site players.',
	},
})
const normalizeId = (id: string) => id.replaceAll('-', '').toLowerCase()
const players = computed(() =>
	(accountsCard?.value?.accounts ?? []).map((account) => {
		const sitePlayer =
			account.account_type === 'yggdrasil'
				? skinSitePlayers.value.find(
						(player) => normalizeId(player.uuid) === normalizeId(account.profile.id),
					)
				: undefined
		const skin = accountsCard?.value?.getAccountSkin(account)
		return {
			id: account.profile.id,
			label: account.profile.name,
			avatar: sitePlayer?.headDataUrl ?? accountsCard?.value?.getAccountAvatarUrl(account),
			texture: sitePlayer?.skinDataUrl ?? skin?.texture ?? '',
			variant: sitePlayer?.model
				? sitePlayer.model === 'slim'
					? ('SLIM' as const)
					: ('CLASSIC' as const)
				: (skin?.variant ?? 'CLASSIC'),
			account,
		}
	}),
)
const selectedId = computed(() => {
	const id = selectedSkinSitePlayerId.value ?? accountsCard?.value?.defaultUser
	return (
		players.value.find((player) => id && normalizeId(player.id) === normalizeId(id))?.id ?? null
	)
})
const selectedPlayer = computed(() =>
	players.value.find((player) => player.id === selectedId.value),
)
const loading = computed(
	() =>
		!players.value.length &&
		(skinSiteStatus.value === 'checking' ||
			skinSitePlayersStatus.value === 'checking' ||
			!accountsCard?.value),
)
const texture = ref('')
const textureLoading = ref(false)
let textureRevision = 0
watch(
	// Background account/head refreshes rebuild player objects without changing the skin.
	[
		() => selectedPlayer.value?.id,
		() => selectedPlayer.value?.texture,
		() => selectedPlayer.value?.variant,
	],
	async () => {
		const player = selectedPlayer.value
		const revision = ++textureRevision
		texture.value = ''
		textureLoading.value = !!player?.texture
		if (!player?.texture) return
		try {
			const normalized = await get_normalized_skin_texture({
				texture_key: `${player.id}:${player.texture}`,
				texture: player.texture,
				variant: player.variant,
				source: 'custom_external',
				is_equipped: true,
			})
			if (revision === textureRevision) texture.value = normalized
		} catch {
			if (revision === textureRevision && player.texture.startsWith('data:image/'))
				texture.value = player.texture
		} finally {
			if (revision === textureRevision) textureLoading.value = false
		}
	},
	{ immediate: true },
)
onUnmounted(() => {
	textureRevision++
})

async function select(id: string) {
	if (pendingId.value) return
	const player = players.value.find((player) => player.id === id)
	if (!player) return
	pendingId.value = id
	try {
		await accountsCard?.value?.setAccount(player.account)
	} finally {
		pendingId.value = null
	}
}
</script>

<template>
	<section class="player-preview" :aria-label="formatMessage(messages.players)">
		<SkinSiteSelectionRail
			v-if="players.length"
			:items="players"
			:selected="selectedId"
			:label="formatMessage(messages.players)"
			vertical
			:disabled="!!pendingId || accountsCard?.accountSelectionPending"
			@select="select"
		/>
		<div class="preview-stage" :aria-busy="!!pendingId || loading || textureLoading">
			<SkinPreviewRenderer
				v-if="selectedPlayer && texture"
				:texture-src="texture"
				:variant="selectedPlayer.variant"
				:nametag="selectedPlayer.label"
				:initial-rotation="Math.PI / 8"
				fit
			/>
			<div v-else class="preview-empty" role="status">
				<SpinnerIcon v-if="loading || textureLoading" class="size-7 animate-spin" />
				<UserIcon v-else class="size-10 opacity-40" />
				<span v-if="loading || textureLoading">{{ formatMessage(messages.loading) }}</span>
				<template v-else-if="selectedPlayer">
					<strong class="text-contrast">{{ selectedPlayer.label }}</strong>
					<span>{{ formatMessage(messages.unavailable) }}</span>
				</template>
				<template v-else>
					<strong class="text-contrast">{{ formatMessage(messages.empty) }}</strong>
					<span>{{ formatMessage(messages.emptyHint) }}</span>
				</template>
			</div>
			<div v-if="pendingId" class="preview-switching">
				<SpinnerIcon class="size-4 animate-spin" />
			</div>
		</div>
		<div v-if="skinSitePlayersStatus === 'error'" class="preview-error">
			<span>{{ formatMessage(messages.failed) }}</span>
			<button type="button" @click="requestSkinSitePlayers().catch(() => {})">
				<RefreshCwIcon class="size-4" />{{ formatMessage(commonMessages.retryButton) }}
			</button>
		</div>
	</section>
</template>

<style scoped>
.player-preview {
	position: relative;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: center;
	gap: 1.5rem;
	min-width: 0;
}
.preview-stage {
	position: relative;
	min-width: 0;
	height: clamp(22rem, 57dvh, 38rem);
}
.preview-stage:only-child {
	grid-column: 1 / -1;
}
.preview-empty {
	display: flex;
	height: 100%;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 0.75rem;
	padding: 1.5rem;
	text-align: center;
	color: var(--color-secondary);
	font-size: 0.875rem;
}
.preview-switching {
	position: absolute;
	top: 1rem;
	right: 1rem;
	color: var(--color-brand);
}
.preview-error {
	grid-column: 1 / -1;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.75rem;
	color: var(--color-secondary);
	font-size: 0.75rem;
}
.preview-error button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	border: 0;
	background: transparent;
	color: var(--color-brand);
	cursor: pointer;
}
@media (max-width: 720px) {
	.player-preview {
		gap: 0.75rem;
	}
	.preview-stage {
		height: clamp(20rem, 48dvh, 28rem);
	}
}
</style>
