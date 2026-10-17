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

import { skinSitePasswordReset, skinSitePasswordResetEmailVerify } from '@/helpers/skin-site-api'

import SkinSiteCaptchaModal from './SkinSiteCaptchaModal.vue'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.reset.title', defaultMessage: 'Reset password' },
	email: { id: 'app.skin-site.reset.email', defaultMessage: 'Email' },
	emailHint: {
		id: 'app.skin-site.reset.email-hint',
		defaultMessage: 'Use the address you registered with.',
	},
	code: { id: 'app.skin-site.reset.code', defaultMessage: 'Verification code' },
	sendCode: { id: 'app.skin-site.reset.send-code', defaultMessage: 'Send code' },
	sending: { id: 'app.skin-site.reset.sending', defaultMessage: 'Sending…' },
	resendIn: { id: 'app.skin-site.reset.resend-in', defaultMessage: 'Sent ({seconds}s)' },
	newPassword: { id: 'app.skin-site.reset.new-password', defaultMessage: 'New password' },
	repeatPassword: { id: 'app.skin-site.reset.repeat-password', defaultMessage: 'Repeat password' },
	passwordHint: {
		id: 'app.skin-site.reset.password-hint',
		defaultMessage: '6–50 characters with upper case, lower case and a digit.',
	},
	mismatch: { id: 'app.skin-site.reset.mismatch', defaultMessage: 'Passwords do not match.' },
	submit: { id: 'app.skin-site.reset.submit', defaultMessage: 'Reset password' },
	success: {
		id: 'app.skin-site.reset.success',
		defaultMessage: 'Password updated. You can sign in now.',
	},
})

const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,50}$/
const COUNTDOWN_SECONDS = 60

const modal = ref<InstanceType<typeof NewModal>>()
const captchaModal = ref<InstanceType<typeof SkinSiteCaptchaModal>>()
const email = ref('')
const code = ref('')
const newPassword = ref('')
const repeatPassword = ref('')
const sending = ref(false)
const working = ref(false)
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const emit = defineEmits<{ (e: 'done' | 'cancel'): void }>()

function stopTimer() {
	if (timer) clearInterval(timer)
	timer = undefined
}

function startCountdown() {
	countdown.value = COUNTDOWN_SECONDS
	stopTimer()
	timer = setInterval(() => {
		countdown.value -= 1
		if (countdown.value <= 0) stopTimer()
	}, 1000)
}

const canSendCode = computed(
	() => email.value.trim().length > 0 && !sending.value && countdown.value <= 0,
)

const passwordValid = computed(() => PASSWORD_RE.test(newPassword.value))
const passwordsMatch = computed(() => newPassword.value === repeatPassword.value)
const canSubmit = computed(
	() =>
		email.value.trim().length > 0 &&
		code.value.trim().length === 6 &&
		passwordValid.value &&
		passwordsMatch.value &&
		!working.value,
)

function reset() {
	stopTimer()
	email.value = ''
	code.value = ''
	newPassword.value = ''
	repeatPassword.value = ''
	sending.value = false
	working.value = false
	countdown.value = 0
}

function show() {
	reset()
	modal.value?.show()
}

async function sendCode() {
	if (!canSendCode.value) return
	sending.value = true
	try {
		const result = await skinSitePasswordResetEmailVerify(email.value.trim())
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		addNotification({ type: 'success', title: result.payload })
		startCountdown()
	} catch (error) {
		handleError(error)
	} finally {
		sending.value = false
	}
}

function beginReset() {
	if (!canSubmit.value) return
	if (!passwordsMatch.value) {
		handleError(new Error(formatMessage(messages.mismatch)))
		return
	}
	captchaModal.value?.show()
}

async function onCaptchaVerified(clientId: string) {
	working.value = true
	try {
		const result = await skinSitePasswordReset({
			clientId,
			email: email.value.trim(),
			emailVerifyCode: code.value.trim(),
			newPassword: newPassword.value,
		})
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		addNotification({ type: 'success', title: formatMessage(messages.success) })
		modal.value?.hide()
		emit('done')
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

onUnmounted(stopTimer)

defineExpose({ show })
</script>

<template>
	<NewModal ref="modal" :header="formatMessage(messages.title)" @hide="reset">
		<div class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.email) }}</span>
				<StyledInput v-model="email" type="email" autocomplete="email" />
				<span class="text-xs text-secondary">{{ formatMessage(messages.emailHint) }}</span>
			</label>

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.code) }}</span>
				<div class="flex gap-2">
					<StyledInput v-model="code" type="text" class="flex-1" maxlength="6" />
					<button
						type="button"
						class="shrink-0 rounded-full bg-button-bg px-4 text-sm font-semibold text-contrast disabled:opacity-50"
						:disabled="!canSendCode"
						@click="sendCode"
					>
						{{
							sending
								? formatMessage(messages.sending)
								: countdown > 0
									? formatMessage(messages.resendIn, { seconds: countdown })
									: formatMessage(messages.sendCode)
						}}
					</button>
				</div>
			</label>

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.newPassword) }}</span>
				<StyledInput v-model="newPassword" type="password" autocomplete="new-password" />
				<span class="text-xs text-secondary">{{ formatMessage(messages.passwordHint) }}</span>
			</label>

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{
					formatMessage(messages.repeatPassword)
				}}</span>
				<StyledInput v-model="repeatPassword" type="password" autocomplete="new-password" />
				<span v-if="repeatPassword && !passwordsMatch" class="text-xs text-red">
					{{ formatMessage(messages.mismatch) }}
				</span>
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
					@click="beginReset"
				>
					{{ formatMessage(messages.submit) }}
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
