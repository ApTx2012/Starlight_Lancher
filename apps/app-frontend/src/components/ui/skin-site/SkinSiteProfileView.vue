<script setup lang="ts">
import { SpinnerIcon, TrashIcon, UploadIcon } from '@modrinth/assets'
import { Avatar, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import SkinPreviewRenderer from '@modrinth/ui/src/components/skin/SkinPreviewRenderer.vue'
import { computed, onMounted, ref, watch } from 'vue'

import {
	requestSkinSitePlayers,
	skinSitePlayers,
	skinSitePlayersStatus,
	skinSiteStatus,
	skinSiteUser,
} from '@/composables/skin-site-session'
import {
	skinSiteDeleteTexture,
	type SkinSitePlayerSkin,
	skinSitePlayerSkin,
	skinSiteUploadTexture,
	type SkinTextureType,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const emit = defineEmits<{ (e: 'back'): void }>()

const messages = defineMessages({
	title: { id: 'app.skin-site.profile-view.title', defaultMessage: 'Your players' },
	signedOut: {
		id: 'app.skin-site.profile-view.signed-out',
		defaultMessage: 'Sign in to manage your players.',
	},
	loading: { id: 'app.skin-site.profile-view.loading', defaultMessage: 'Loading players…' },
	noPlayers: {
		id: 'app.skin-site.profile-view.no-players',
		defaultMessage: 'No players yet.',
	},
	selectHint: {
		id: 'app.skin-site.profile-view.select-hint',
		defaultMessage: 'Select a player to preview and edit its textures.',
	},
	skin: { id: 'app.skin-site.profile-view.skin', defaultMessage: 'Skin' },
	cape: { id: 'app.skin-site.profile-view.cape', defaultMessage: 'Cape' },
	elytra: { id: 'app.skin-site.profile-view.elytra', defaultMessage: 'Elytra' },
	upload: { id: 'app.skin-site.profile-view.upload', defaultMessage: 'Upload' },
	remove: { id: 'app.skin-site.profile-view.remove', defaultMessage: 'Remove' },
	readonly: {
		id: 'app.skin-site.profile-view.readonly',
		defaultMessage: 'Mojang accounts are managed by Mojang; textures cannot be edited here.',
	},
	uploaded: { id: 'app.skin-site.profile-view.uploaded', defaultMessage: 'Texture updated.' },
	removed: { id: 'app.skin-site.profile-view.removed', defaultMessage: 'Texture removed.' },
	back: { id: 'app.skin-site.profile-view.back', defaultMessage: 'Back to home' },
})
const selectedId = ref<string | null>(null)
const texture = ref<SkinSitePlayerSkin>({})
const loadingTexture = ref(false)
const uploading = ref<SkinTextureType | null>(null)

const signedIn = computed(() => skinSiteStatus.value === 'signed-in' && !!skinSiteUser.value)
const players = computed(() => skinSitePlayers.value)
const playersLoading = computed(
	() => skinSitePlayersStatus.value === 'checking' || skinSitePlayersStatus.value === 'idle',
)
const selectedPlayer = computed(
	() => players.value.find((p) => p.uuid === selectedId.value) ?? null,
)
const editable = computed(() => !!selectedPlayer.value && !selectedPlayer.value.isMojang)

const skinVariant = computed<'CLASSIC' | 'SLIM'>(() =>
	texture.value.model === 'slim' ? 'SLIM' : 'CLASSIC',
)

function selectPlayer(id: string) {
	selectedId.value = id
}

async function loadTexture(uuid: string) {
	loadingTexture.value = true
	texture.value = {}
	try {
		const result = await skinSitePlayerSkin(uuid)
		if (result.success && result.payload) texture.value = result.payload
	} catch (error) {
		handleError(error)
	} finally {
		loadingTexture.value = false
	}
}

watch(selectedId, (id) => {
	if (id) void loadTexture(id)
	else texture.value = {}
})

async function onUpload(type: SkinTextureType, event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file || !selectedId.value) return
	uploading.value = type
	try {
		const metadata: Record<string, string> = {}
		if (type === 'SKIN') metadata.model = texture.value.model ?? 'default'
		const result = await skinSiteUploadTexture(selectedId.value, file, type, metadata)
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		addNotification({ type: 'success', title: formatMessage(messages.uploaded) })
		await loadTexture(selectedId.value)
	} catch (error) {
		handleError(error)
	} finally {
		uploading.value = null
	}
}

async function removeTexture(type: SkinTextureType) {
	if (!selectedId.value) return
	uploading.value = type
	try {
		const result = await skinSiteDeleteTexture(selectedId.value, type)
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		addNotification({ type: 'success', title: formatMessage(messages.removed) })
		await loadTexture(selectedId.value)
	} catch (error) {
		handleError(error)
	} finally {
		uploading.value = null
	}
}

onMounted(() => {
	if (signedIn.value) void requestSkinSitePlayers().catch(() => {})
})

watch(signedIn, (value) => {
	if (value) void requestSkinSitePlayers().catch(() => {})
})
</script>
<template>
	<div class="flex flex-col gap-4">
		<button
			type="button"
			class="flex w-fit items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
			@click="emit('back')"
		>
			← {{ formatMessage(messages.back) }}
		</button>

		<div v-if="!signedIn" class="rounded-2xl border border-solid border-surface-5 bg-bg-raised p-4">
			<p class="m-0 text-sm text-secondary">{{ formatMessage(messages.signedOut) }}</p>
		</div>

		<div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
			<!-- Player list -->
			<div
				class="flex flex-col gap-2 rounded-2xl border border-solid border-surface-5 bg-bg-raised p-3"
			>
				<h3 class="m-0 text-base font-semibold text-contrast">
					{{ formatMessage(messages.title) }}
				</h3>

				<div v-if="playersLoading" class="flex items-center gap-2 text-sm text-secondary">
					<SpinnerIcon class="size-4 animate-spin" />
					{{ formatMessage(messages.loading) }}
				</div>
				<p v-else-if="!players.length" class="m-0 text-sm text-secondary">
					{{ formatMessage(messages.noPlayers) }}
				</p>
				<button
					v-for="player in players"
					:key="player.uuid"
					type="button"
					class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors"
					:class="
						player.uuid === selectedId
							? 'bg-brand-highlight text-contrast'
							: 'bg-button-bg hover:brightness-110'
					"
					@click="selectPlayer(player.uuid)"
				>
					<Avatar
						:src="player.headDataUrl"
						:alt="player.name"
						size="1.75rem"
						pixelated
						class="!rounded-md"
					/>
					<span class="min-w-0 flex-1 truncate text-sm font-medium">{{ player.name }}</span>
					<span v-if="player.isMojang" class="shrink-0 text-[10px] uppercase text-secondary"
						>Mojang</span
					>
				</button>
			</div>

			<!-- Preview + texture actions -->
			<div
				class="flex flex-col gap-4 rounded-2xl border border-solid border-surface-5 bg-bg-raised p-4"
			>
				<p v-if="!selectedPlayer" class="m-0 text-sm text-secondary">
					{{ formatMessage(messages.selectHint) }}
				</p>

				<template v-else>
					<div class="flex items-center gap-2">
						<h3 class="m-0 text-base font-semibold text-contrast">{{ selectedPlayer.name }}</h3>
						<span v-if="selectedPlayer.isMojang" class="text-xs text-secondary">Mojang</span>
					</div>

					<div class="relative h-80 w-full overflow-hidden rounded-xl bg-button-bg">
						<div v-if="loadingTexture" class="absolute inset-0 flex items-center justify-center">
							<SpinnerIcon class="size-6 animate-spin text-secondary" />
						</div>
						<SkinPreviewRenderer
							v-else
							:texture-src="texture.skin ?? ''"
							:cape-src="texture.cape"
							:variant="skinVariant"
							:nametag="selectedPlayer.name"
							:initial-rotation="Math.PI / 8"
							class="size-full"
						/>
					</div>

					<p v-if="!editable" class="m-0 text-xs text-secondary">
						{{ formatMessage(messages.readonly) }}
					</p>

					<div v-else class="flex flex-col gap-2">
						<div
							v-for="entry in [
								{ type: 'SKIN' as SkinTextureType, label: messages.skin, value: texture.skin },
								{ type: 'CAPE' as SkinTextureType, label: messages.cape, value: texture.cape },
								{
									type: 'ELYTRA' as SkinTextureType,
									label: messages.elytra,
									value: texture.elytra,
								},
							]"
							:key="entry.type"
							class="flex items-center gap-2 rounded-xl bg-button-bg px-3 py-2"
						>
							<span class="min-w-0 flex-1 text-sm font-medium text-contrast">
								{{ formatMessage(entry.label) }}
							</span>
							<span class="shrink-0 text-xs text-secondary">
								{{ entry.value ? '✓' : '—' }}
							</span>
							<label
								class="flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-contrast"
							>
								<UploadIcon class="size-3" />
								{{ formatMessage(messages.upload) }}
								<input
									type="file"
									accept="image/png"
									class="hidden"
									:disabled="uploading !== null"
									@change="(e) => onUpload(entry.type, e)"
								/>
							</label>
							<button
								v-if="entry.value"
								type="button"
								class="flex shrink-0 items-center gap-1 rounded-full bg-button-bg px-3 py-1 text-xs font-semibold text-red"
								:disabled="uploading !== null"
								@click="removeTexture(entry.type)"
							>
								<TrashIcon class="size-3" />
								{{ formatMessage(messages.remove) }}
							</button>
						</div>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>
