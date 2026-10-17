<script setup lang="ts">
import {
	commonMessages,
	defineMessages,
	injectNotificationManager,
	NewModal,
	StyledInput,
	useVIntl,
} from '@modrinth/ui'
import { computed, ref } from 'vue'

import { reloadSkinSiteSession, signInSkinSite } from '@/composables/skin-site-session'

import SkinSiteCaptchaModal from './SkinSiteCaptchaModal.vue'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.login.title', defaultMessage: 'Sign in to StarLight' },
	username: { id: 'app.skin-site.login.username', defaultMessage: 'Username or email' },
	password: { id: 'app.skin-site.login.password', defaultMessage: 'Password' },
	signIn: { id: 'app.skin-site.login.sign-in', defaultMessage: 'Sign in' },
	signingIn: { id: 'app.skin-site.login.signing-in', defaultMessage: 'Signing in…' },
	usernameHint: {
		id: 'app.skin-site.login.username-hint',
		defaultMessage: '3–16 characters, or a registered email address.',
	},
	passwordHint: {
		id: 'app.skin-site.login.password-hint',
		defaultMessage: '6–50 characters with upper case, lower case and a digit.',
	},
	success: { id: 'app.skin-site.login.success', defaultMessage: 'Signed in to StarLight.' },
})

const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,50}$/

const modal = ref<InstanceType<typeof NewModal>>()
const captchaModal = ref<InstanceType<typeof SkinSiteCaptchaModal>>()
const username = ref('')
const password = ref('')
const working = ref(false)

const emit = defineEmits<{ (e: 'signed-in' | 'cancel'): void }>()

const usernameValid = computed(() => {
	const value = username.value.trim()
	if (!value) return false
	if (value.includes('@')) return value.length < 64
	return value.length >= 3 && value.length <= 16
})

const passwordValid = computed(() => PASSWORD_RE.test(password.value))
const canSubmit = computed(() => usernameValid.value && passwordValid.value && !working.value)

function reset() {
	username.value = ''
	password.value = ''
	working.value = false
}

function show() {
	reset()
	modal.value?.show()
}

async function beginSignIn() {
	if (!canSubmit.value) return
	captchaModal.value?.show()
}

async function onCaptchaVerified(clientId: string) {
	working.value = true
	try {
		const result = await signInSkinSite({
			username: username.value.trim(),
			password: password.value,
			clientId,
		})
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		await reloadSkinSiteSession()
		addNotification({ type: 'success', title: formatMessage(messages.success) })
		modal.value?.hide()
		reset()
		emit('signed-in')
	} catch (error) {
		handleError(error)
	} finally {
		working.value = false
	}
}

function cancel() {
	modal.value?.hide()
	emit('cancel')
}

defineExpose({ show })
</script>

<template>
	<NewModal ref="modal" :header="formatMessage(messages.title)" @hide="reset">
		<div class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.username) }}</span>
				<StyledInput v-model="username" type="text" autocomplete="username" />
				<span class="text-xs text-secondary">{{ formatMessage(messages.usernameHint) }}</span>
			</label>

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.password) }}</span>
				<StyledInput v-model="password" type="password" autocomplete="current-password" />
				<span class="text-xs text-secondary">{{ formatMessage(messages.passwordHint) }}</span>
			</label>
		</div>

		<template #actions>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-full px-4 py-2 text-secondary hover:bg-button-bg"
					@click="cancel"
				>
					{{ formatMessage(commonMessages.cancelButton) }}
				</button>
				<button
					type="button"
					class="rounded-full bg-brand px-4 py-2 font-semibold text-contrast disabled:opacity-50"
					:disabled="!canSubmit"
					@click="beginSignIn"
				>
					{{ formatMessage(working ? messages.signingIn : messages.signIn) }}
				</button>
			</div>
		</template>
	</NewModal>

	<SkinSiteCaptchaModal
		ref="captchaModal"
		@verified="onCaptchaVerified"
		@cancel="working = false"
	/>
</template>
