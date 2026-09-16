<script setup lang="ts">
import { ButtonStyled, NewModal, useVIntl } from '@modrinth/ui'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import MinecraftLoginModal from '@/components/ui/MinecraftLoginModal.vue'
import {
	openSkinSiteLogin,
	requestSkinSitePlayers,
	skinSitePlayers,
	skinSiteStatus,
	skinSiteUser,
} from '@/composables/skin-site-session'
import { users } from '@/helpers/auth'
import { getInstanceMode } from '@/helpers/hosted-packs'
import {
	registerInstancePlayerPicker,
	saveInstancePlayer,
	waitForSkinSiteSession,
	type InstancePlayer,
	type PlayerChoice,
} from '@/helpers/instance-player'
import { playerMessages as messages } from './instance-player-messages'

const { formatMessage } = useVIntl()

const modal = ref<InstanceType<typeof NewModal>>()
const microsoftLogin = ref<InstanceType<typeof MinecraftLoginModal>>()
const router = useRouter()
const accounts = ref<PlayerChoice[]>([])
const active = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const instanceId = ref('')
const locked = ref<InstancePlayer | null>(null)
const awaitingSkinLogin = ref(false)
let hideForLogin = false
let generation = 0
let resolveSelection: ((player: InstancePlayer) => void) | undefined
let rejectSelection: ((reason: Error) => void) | undefined
const choices = computed(() => {
	const skin: PlayerChoice[] =
		skinSiteStatus.value === 'signed-in'
			? skinSitePlayers.value
					.filter((player) => !player.isMojang)
					.map((player) => ({
						id: player.uuid,
						name: player.name,
						account_type: 'yggdrasil',
						skin_site_user: skinSiteUser.value?.uuid,
						head: player.headDataUrl,
					}))
			: []
	return [...skin, ...accounts.value].filter(
		(player) =>
			!locked.value ||
			(player.id.replaceAll('-', '') === locked.value.id.replaceAll('-', '') &&
				player.account_type === locked.value.account_type &&
				(player.skin_site_user ?? null) === (locked.value.skin_site_user ?? null)),
	)
})

async function refresh() {
	const revision = ++generation
	loading.value = true
	error.value = ''
	try {
		const [available, mode] = await Promise.all([users(), getInstanceMode(instanceId.value)])
		if (revision !== generation) return
		accounts.value = available
			.filter(
				(account) =>
					account.account_type === 'microsoft' ||
					(mode === 'local' && account.account_type === 'offline'),
			)
			.map((account) => ({
				id: account.profile.id,
				name: account.profile.name,
				account_type: account.account_type,
			}))
		await waitForSkinSiteSession()
		if (revision !== generation) return
		if (skinSiteStatus.value === 'signed-in') await requestSkinSitePlayers()
		if (skinSiteStatus.value === 'error') throw new Error('无法确认皮肤站登录状态，请重试。')
	} catch (cause) {
		if (revision === generation)
			error.value = cause instanceof Error ? cause.message : String(cause)
	} finally {
		if (revision === generation) loading.value = false
	}
}

function cancelled() {
	if (hideForLogin) {
		hideForLogin = false
		return
	}
	if (!active.value) return
	active.value = false
	awaitingSkinLogin.value = false
	generation++
	rejectSelection?.(new Error('已取消选择实例玩家'))
	resolveSelection = undefined
	rejectSelection = undefined
}

async function select(player: PlayerChoice) {
	if (loading.value || saving.value || !active.value) return
	saving.value = true
	error.value = ''
	try {
		const { head: _, ...binding } = player
		await saveInstancePlayer(instanceId.value, binding)
		active.value = false
		resolveSelection?.(binding)
		resolveSelection = undefined
		rejectSelection = undefined
		modal.value?.hide()
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause)
	} finally {
		saving.value = false
	}
}

function signInSkinSite() {
	awaitingSkinLogin.value = true
	hideForLogin = true
	openSkinSiteLogin()
	modal.value?.hide()
	void router.push('/starlight-skin')
}

const unregister = registerInstancePlayerPicker((id, saved) => {
	if (active.value) return Promise.reject(new Error('请先完成当前实例的玩家选择。'))
	instanceId.value = id
	locked.value = saved
	accounts.value = []
	awaitingSkinLogin.value = false
	active.value = true
	modal.value?.show()
	void refresh()
	return new Promise((resolve, reject) => {
		resolveSelection = resolve
		rejectSelection = reject
	})
})
watch([skinSiteStatus, () => skinSiteUser.value?.uuid], () => {
	if (!active.value || saving.value) return
	if (
		awaitingSkinLogin.value &&
		skinSiteStatus.value === 'signed-in' &&
		(!locked.value?.skin_site_user || locked.value.skin_site_user === skinSiteUser.value?.uuid)
	) {
		awaitingSkinLogin.value = false
		modal.value?.show()
	}
	void refresh()
})
onUnmounted(() => {
	unregister()
	cancelled()
})
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.title)"
		:closable="!saving"
		:on-hide="cancelled"
	>
		<div class="flex flex-col gap-3">
			<p class="m-0 text-secondary">
				{{
					locked
						? formatMessage(messages.restore, { name: locked.name })
						: formatMessage(messages.remember)
				}}
			</p>
			<p v-if="loading" class="m-0" role="status">{{ formatMessage(messages.loading) }}</p>
			<template v-else>
				<ButtonStyled v-for="player in choices" :key="`${player.account_type}:${player.id}`">
					<button
						type="button"
						:disabled="saving"
						class="flex items-center gap-3"
						@click="select(player)"
					>
						<img
							v-if="player.head"
							:src="player.head"
							alt=""
							class="size-8 rounded-md [image-rendering:pixelated]"
						/>
						<span>{{ player.name }}</span
						><span class="text-secondary">{{
							formatMessage(
								player.account_type === 'microsoft'
									? messages.licensed
									: player.account_type === 'offline'
										? messages.offline
										: messages.skin,
							)
						}}</span>
					</button>
				</ButtonStyled>
				<p v-if="!choices.length && !error && !locked" class="m-0 text-secondary">
					{{ formatMessage(skinSiteStatus === 'signed-in' ? messages.empty : messages.signIn) }}
				</p>
			</template>
			<p v-if="error" class="m-0 text-red" role="alert">{{ error }}</p>
			<ButtonStyled v-if="error"
				><button :disabled="loading || saving" @click="refresh">
					{{ formatMessage(messages.retry) }}
				</button></ButtonStyled
			>
			<ButtonStyled
				v-if="
					skinSiteStatus === 'signed-out' ||
					(locked?.skin_site_user && locked.skin_site_user !== skinSiteUser?.uuid)
				"
				><button :disabled="saving" @click="signInSkinSite">
					{{ formatMessage(messages.skinLogin) }}
				</button></ButtonStyled
			>
			<div class="flex flex-col items-center gap-2">
				<span class="text-secondary">{{ formatMessage(messages.or) }}</span>
				<ButtonStyled
					><button :disabled="loading || saving" @click="microsoftLogin?.showDeviceLogin()">
						{{ formatMessage(messages.useMicrosoft) }}
					</button></ButtonStyled
				>
			</div>
			<p v-if="saving" class="m-0" role="status">{{ formatMessage(messages.saving) }}</p>
		</div>
	</NewModal>
	<MinecraftLoginModal ref="microsoftLogin" @complete="refresh" />
</template>
