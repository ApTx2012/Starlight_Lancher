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

import { reloadSkinSiteSession, signInSkinSite } from '@/composables/skin-site-session'
import {
	skinSiteRegister,
	skinSiteRegisterCondition,
	skinSiteRegisterEmailVerify,
} from '@/helpers/skin-site-api'

import SkinSiteCaptchaModal from './SkinSiteCaptchaModal.vue'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.register.title', defaultMessage: 'Create a StarLight account' },
	email: { id: 'app.skin-site.register.email', defaultMessage: 'Email' },
	code: { id: 'app.skin-site.register.code', defaultMessage: 'Verification code' },
	sendCode: { id: 'app.skin-site.register.send-code', defaultMessage: 'Send code' },
	sending: { id: 'app.skin-site.register.sending', defaultMessage: 'Sending…' },
	resendIn: { id: 'app.skin-site.register.resend-in', defaultMessage: 'Sent ({seconds}s)' },
	password: { id: 'app.skin-site.register.password', defaultMessage: 'Password' },
	repeatPassword: {
		id: 'app.skin-site.register.repeat-password',
		defaultMessage: 'Repeat password',
	},
	passwordHint: {
		id: 'app.skin-site.register.password-hint',
		defaultMessage: '6–50 characters with upper case, lower case and a digit.',
	},
	mismatch: { id: 'app.skin-site.register.mismatch', defaultMessage: 'Passwords do not match.' },
	qq: { id: 'app.skin-site.register.qq', defaultMessage: 'QQ (optional)' },
	inviteCode: { id: 'app.skin-site.register.invite-code', defaultMessage: 'Invite code' },
	inviteRequired: {
		id: 'app.skin-site.register.invite-required',
		defaultMessage: 'This server requires an invite code.',
	},
	submit: { id: 'app.skin-site.register.submit', defaultMessage: 'Create account' },
	success: {
		id: 'app.skin-site.register.success',
		defaultMessage: 'Account created and signed in.',
	},
	closed: {
		id: 'app.skin-site.register.closed',
		defaultMessage: 'Registration is currently closed on this server.',
	},
})

const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,50}$/
const COUNTDOWN_SECONDS = 60

const modal = ref<InstanceType<typeof NewModal>>()
const captchaModal = ref<InstanceType<typeof SkinSiteCaptchaModal>>()
const email = ref('')
const code = ref('')
const password = ref('')
const repeatPassword = ref('')
const qq = ref('')
const inviteCode = ref('')
const inviteRequired = ref(false)
const registerAllowed = ref(true)
const sending = ref(false)
const working = ref(false)
const countdown = ref(0)
const loadingCondition = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const emit = defineEmits<{ (e: 'signed-in' | 'cancel'): void }>()

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

const passwordValid = computed(() => PASSWORD_RE.test(password.value))
const passwordsMatch = computed(() => password.value === repeatPassword.value)
const qqValid = computed(() => qq.value.trim() === '' || /^\d{5,}$/.test(qq.value.trim()))
const inviteValid = computed(() => !inviteRequired.value || inviteCode.value.trim().length > 0)
const canSubmit = computed(
	() =>
		registerAllowed.value &&
		email.value.trim().length > 0 &&
		code.value.trim().length === 6 &&
		passwordValid.value &&
		passwordsMatch.value &&
		qqValid.value &&
		inviteValid.value &&
		!working.value,
)

function reset() {
	stopTimer()
	email.value = ''
	code.value = ''
	password.value = ''
	repeatPassword.value = ''
	qq.value = ''
	inviteCode.value = ''
	sending.value = false
	working.value = false
	countdown.value = 0
}

async function loadCondition() {
	loadingCondition.value = true
	try {
		const result = await skinSiteRegisterCondition()
		if (result.success) {
			registerAllowed.value = result.payload.registerAllowed
			inviteRequired.value = result.payload.inviteCodeRequired
		} else {
			registerAllowed.value = false
		}
	} finally {
		loadingCondition.value = false
	}
}

async function show() {
	reset()
	modal.value?.show()
	await loadCondition()
}

async function sendCode() {
	if (!canSendCode.value) return
	sending.value = true
	try {
		const result = await skinSiteRegisterEmailVerify(email.value.trim())
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

function beginRegister() {
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
		const result = await skinSiteRegister({
			email: email.value.trim(),
			emailVerifyCode: code.value.trim(),
			password: password.value,
			qq: qq.value.trim() ? Number(qq.value.trim()) : undefined,
			inviteCode: inviteCode.value.trim() || undefined,
			clientId,
		})
		if (!result.success) {
			handleError(new Error(result.errorMessage))
			return
		}
		// Registration returns a JWT; persist it through the normal sign-in path.
		await signInSkinSite({ username: result.payload.username, password: password.value, clientId })
		await reloadSkinSiteSession()
		addNotification({ type: 'success', title: formatMessage(messages.success) })
		modal.value?.hide()
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

onUnmounted(stopTimer)

defineExpose({ show })
</script>

<template>
	<NewModal ref="modal" :header="formatMessage(messages.title)" @hide="reset">
		<div v-if="!loadingCondition && !registerAllowed" class="text-secondary">
			{{ formatMessage(messages.closed) }}
		</div>

		<div v-else class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.email) }}</span>
				<StyledInput v-model="email" type="email" autocomplete="email" />
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
				<span class="font-semibold text-contrast">{{ formatMessage(messages.password) }}</span>
				<StyledInput v-model="password" type="password" autocomplete="new-password" />
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

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.qq) }}</span>
				<StyledInput v-model="qq" type="text" inputmode="numeric" />
			</label>

			<label v-if="inviteRequired" class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.inviteCode) }}</span>
				<StyledInput v-model="inviteCode" type="text" />
				<span class="text-xs text-secondary">{{ formatMessage(messages.inviteRequired) }}</span>
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
					@click="beginRegister"
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
