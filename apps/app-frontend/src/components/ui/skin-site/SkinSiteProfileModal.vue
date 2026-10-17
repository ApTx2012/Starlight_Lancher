<script setup lang="ts">
import {
	commonMessages,
	defineMessages,
	injectNotificationManager,
	NewModal,
	StyledInput,
	useVIntl,
} from '@modrinth/ui'
import { computed, onUnmounted, ref } from 'vue'

import { reloadSkinSiteSession, skinSiteUser } from '@/composables/skin-site-session'
import {
	skinSiteChangePassword,
	skinSiteChangeUsername,
	skinSiteChangeYggdrasilPassword,
	skinSiteUploadAvatar,
} from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.profile.title', defaultMessage: 'Account settings' },
	basic: { id: 'app.skin-site.profile.basic', defaultMessage: 'Profile' },
	username: { id: 'app.skin-site.profile.username', defaultMessage: 'Username' },
	usernameHint: {
		id: 'app.skin-site.profile.username-hint',
		defaultMessage: '3–16 characters.',
	},
	save: { id: 'app.skin-site.profile.save', defaultMessage: 'Save' },
	avatar: { id: 'app.skin-site.profile.avatar', defaultMessage: 'Avatar' },
	chooseAvatar: { id: 'app.skin-site.profile.choose-avatar', defaultMessage: 'Choose image' },
	avatarHint: {
		id: 'app.skin-site.profile.avatar-hint',
		defaultMessage: 'Square images work best; the centre is cropped to 256×256.',
	},
	security: { id: 'app.skin-site.profile.security', defaultMessage: 'Security' },
	sitePasswordHint: {
		id: 'app.skin-site.profile.site-password-hint',
		defaultMessage: 'This is the password used to sign in to the skin site.',
	},
	oldPassword: { id: 'app.skin-site.profile.old-password', defaultMessage: 'Current password' },
	newPassword: { id: 'app.skin-site.profile.new-password', defaultMessage: 'New password' },
	repeatPassword: {
		id: 'app.skin-site.profile.repeat-password',
		defaultMessage: 'Repeat new password',
	},
	mismatch: { id: 'app.skin-site.profile.mismatch', defaultMessage: 'Passwords do not match.' },
	passwordHint: {
		id: 'app.skin-site.profile.password-hint',
		defaultMessage: '6–50 characters with upper case, lower case and a digit.',
	},
	submitPassword: {
		id: 'app.skin-site.profile.submit-password',
		defaultMessage: 'Update password',
	},
	minecraftPassword: {
		id: 'app.skin-site.profile.minecraft-password',
		defaultMessage: 'Minecraft password',
	},
	minecraftPasswordHint: {
		id: 'app.skin-site.profile.minecraft-password-hint',
		defaultMessage: 'Used by the launcher; defaults to the website password.',
	},
	resetDefault: {
		id: 'app.skin-site.profile.reset-default',
		defaultMessage: 'Reset to website password',
	},
	saved: { id: 'app.skin-site.profile.saved', defaultMessage: 'Saved.' },
	avatarUploaded: {
		id: 'app.skin-site.profile.avatar-uploaded',
		defaultMessage: 'Avatar updated.',
	},
	passwordChanged: {
		id: 'app.skin-site.profile.password-changed',
		defaultMessage: 'Password updated.',
	},
	minecraftPasswordChanged: {
		id: 'app.skin-site.profile.minecraft-password-changed',
		defaultMessage: 'Minecraft password updated.',
	},
})

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)\S{6,50}$/

const modal = ref<InstanceType<typeof NewModal>>()
const username = ref('')
const savingUsername = ref(false)
const avatarPreview = ref('')
const uploadingAvatar = ref(false)

const oldPassword = ref('')
const newPassword = ref('')
const repeatPassword = ref('')
const savingPassword = ref(false)

const newMinecraftPassword = ref('')
const repeatMinecraftPassword = ref('')
const savingMinecraftPassword = ref(false)

const usernameValid = computed(() => {
	const value = username.value.trim()
	return value.length >= 3 && value.length <= 16
})
const usernameChanged = computed(
	() => !!skinSiteUser.value && username.value.trim() !== skinSiteUser.value.username,
)

const passwordValid = computed(() => PASSWORD_RE.test(newPassword.value))
const passwordsMatch = computed(() => newPassword.value === repeatPassword.value)
const canSavePassword = computed(
	() => !!oldPassword.value && passwordValid.value && passwordsMatch.value && !savingPassword.value,
)

const minecraftPasswordValid = computed(() => PASSWORD_RE.test(newMinecraftPassword.value))
const minecraftPasswordsMatch = computed(
	() => newMinecraftPassword.value === repeatMinecraftPassword.value,
)
const canSaveMinecraftPassword = computed(
	() =>
		minecraftPasswordValid.value && minecraftPasswordsMatch.value && !savingMinecraftPassword.value,
)

function show() {
	username.value = skinSiteUser.value?.username ?? ''
	avatarPreview.value = ''
	oldPassword.value = ''
	newPassword.value = ''
	repeatPassword.value = ''
	newMinecraftPassword.value = ''
	repeatMinecraftPassword.value = ''
	modal.value?.show()
}
async function saveUsername() {
	if (!usernameChanged.value || !usernameValid.value) return
	savingUsername.value = true
	try {
		const result = await skinSiteChangeUsername(username.value.trim())
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		await reloadSkinSiteSession()
		addNotification({ type: 'success', title: formatMessage(messages.saved) })
	} catch (error) {
		handleError(error)
	} finally {
		savingUsername.value = false
	}
}

/** Centre-crop the picked image to a square and scale it to 256×256. */
async function cropToSquare(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file)
	const side = Math.min(bitmap.width, bitmap.height)
	const sx = (bitmap.width - side) / 2
	const sy = (bitmap.height - side) / 2

	const canvas = document.createElement('canvas')
	canvas.width = 256
	canvas.height = 256
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('无法创建画布')
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 256, 256)
	bitmap.close?.()

	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('无法处理图片'))), 'image/png')
	})
}

async function onAvatarPicked(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file) return
	uploadingAvatar.value = true
	try {
		const blob = await cropToSquare(file)
		avatarPreview.value = URL.createObjectURL(blob)
		const result = await skinSiteUploadAvatar(blob)
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		await reloadSkinSiteSession()
		addNotification({ type: 'success', title: formatMessage(messages.avatarUploaded) })
	} catch (error) {
		handleError(error)
	} finally {
		uploadingAvatar.value = false
	}
}

async function savePassword() {
	if (!canSavePassword.value) return
	savingPassword.value = true
	try {
		const result = await skinSiteChangePassword(oldPassword.value, newPassword.value)
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		oldPassword.value = ''
		newPassword.value = ''
		repeatPassword.value = ''
		addNotification({ type: 'success', title: formatMessage(messages.passwordChanged) })
	} catch (error) {
		handleError(error)
	} finally {
		savingPassword.value = false
	}
}

async function saveMinecraftPassword(resetToDefault: boolean) {
	if (!resetToDefault && !canSaveMinecraftPassword.value) return
	savingMinecraftPassword.value = true
	try {
		const result = await skinSiteChangeYggdrasilPassword(
			resetToDefault ? null : newMinecraftPassword.value,
		)
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		newMinecraftPassword.value = ''
		repeatMinecraftPassword.value = ''
		addNotification({ type: 'success', title: formatMessage(messages.minecraftPasswordChanged) })
	} catch (error) {
		handleError(error)
	} finally {
		savingMinecraftPassword.value = false
	}
}

function close() {
	modal.value?.hide()
}

onUnmounted(() => {
	if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
})

defineExpose({ show })
</script>
<template>
	<NewModal ref="modal" :header="formatMessage(messages.title)">
		<div class="flex flex-col gap-6">
			<section class="flex flex-col gap-3">
				<h3 class="m-0 text-base font-semibold text-contrast">
					{{ formatMessage(messages.basic) }}
				</h3>

				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold text-contrast">{{
						formatMessage(messages.username)
					}}</span>
					<div class="flex gap-2">
						<StyledInput v-model="username" type="text" class="flex-1" maxlength="16" />
						<button
							type="button"
							class="shrink-0 rounded-full bg-brand px-4 text-sm font-semibold text-contrast disabled:opacity-50"
							:disabled="!usernameChanged || !usernameValid || savingUsername"
							@click="saveUsername"
						>
							{{ formatMessage(messages.save) }}
						</button>
					</div>
					<span class="text-xs text-secondary">{{ formatMessage(messages.usernameHint) }}</span>
				</label>

				<div class="flex flex-col gap-1">
					<span class="text-sm font-semibold text-contrast">{{
						formatMessage(messages.avatar)
					}}</span>
					<div class="flex items-center gap-3">
						<img
							v-if="avatarPreview"
							:src="avatarPreview"
							alt=""
							class="size-12 rounded-lg object-cover"
						/>
						<label
							class="cursor-pointer rounded-full bg-button-bg px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
						>
							{{ formatMessage(messages.chooseAvatar) }}
							<input
								type="file"
								accept="image/*"
								class="hidden"
								:disabled="uploadingAvatar"
								@change="onAvatarPicked"
							/>
						</label>
					</div>
					<span class="text-xs text-secondary">{{ formatMessage(messages.avatarHint) }}</span>
				</div>
			</section>

			<section class="flex flex-col gap-3">
				<h3 class="m-0 text-base font-semibold text-contrast">
					{{ formatMessage(messages.security) }}
				</h3>
				<span class="text-sm text-secondary">{{ formatMessage(messages.sitePasswordHint) }}</span>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<StyledInput
						v-model="oldPassword"
						type="password"
						:placeholder="formatMessage(messages.oldPassword)"
						autocomplete="current-password"
					/>
					<StyledInput
						v-model="newPassword"
						type="password"
						:placeholder="formatMessage(messages.newPassword)"
						autocomplete="new-password"
					/>
					<StyledInput
						v-model="repeatPassword"
						type="password"
						:placeholder="formatMessage(messages.repeatPassword)"
						autocomplete="new-password"
					/>
				</div>
				<span class="text-xs text-secondary">{{ formatMessage(messages.passwordHint) }}</span>
				<span v-if="repeatPassword && !passwordsMatch" class="text-xs text-red">
					{{ formatMessage(messages.mismatch) }}
				</span>
				<div class="flex justify-end">
					<button
						type="button"
						class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast disabled:opacity-50"
						:disabled="!canSavePassword"
						@click="savePassword"
					>
						{{ formatMessage(messages.submitPassword) }}
					</button>
				</div>
			</section>

			<section class="flex flex-col gap-3">
				<span class="text-sm font-semibold text-contrast">{{
					formatMessage(messages.minecraftPassword)
				}}</span>
				<span class="text-xs text-secondary">{{
					formatMessage(messages.minecraftPasswordHint)
				}}</span>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<StyledInput
						v-model="newMinecraftPassword"
						type="password"
						:placeholder="formatMessage(messages.newPassword)"
						autocomplete="new-password"
					/>
					<StyledInput
						v-model="repeatMinecraftPassword"
						type="password"
						:placeholder="formatMessage(messages.repeatPassword)"
						autocomplete="new-password"
					/>
				</div>
				<span v-if="repeatMinecraftPassword && !minecraftPasswordsMatch" class="text-xs text-red">
					{{ formatMessage(messages.mismatch) }}
				</span>
				<div class="flex flex-wrap justify-end gap-2">
					<button
						type="button"
						class="rounded-full bg-button-bg px-4 py-2 text-sm font-semibold text-contrast"
						:disabled="savingMinecraftPassword"
						@click="saveMinecraftPassword(true)"
					>
						{{ formatMessage(messages.resetDefault) }}
					</button>
					<button
						type="button"
						class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast disabled:opacity-50"
						:disabled="!canSaveMinecraftPassword"
						@click="saveMinecraftPassword(false)"
					>
						{{ formatMessage(messages.submitPassword) }}
					</button>
				</div>
			</section>
		</div>

		<template #actions>
			<div class="flex justify-end">
				<button
					type="button"
					class="rounded-full px-4 py-2 text-secondary hover:bg-button-bg"
					@click="close"
				>
					{{ formatMessage(commonMessages.closeButton) }}
				</button>
			</div>
		</template>
	</NewModal>
</template>
