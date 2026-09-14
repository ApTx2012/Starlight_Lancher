<script setup lang="ts">
import { ButtonStyled, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, ref, watch } from 'vue'

import LuckyCloverIcon from '@/assets/icons/lucky-clover.svg'
import {
	openSkinSiteLogin,
	requestSkinSiteLuck,
	skinSiteUser,
} from '@/composables/skin-site-session'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	widgetTitle: { id: 'app.home.luck.title', defaultMessage: 'Daily luck index' },
	getLuck: { id: 'app.home.luck.get', defaultMessage: 'Get with one click' },
	loginToGet: { id: 'app.home.luck.login-to-get', defaultMessage: 'Sign in to get it' },
	loading: { id: 'app.home.luck.loading', defaultMessage: 'Asking the little sprite...' },
	error: {
		id: 'app.home.luck.error',
		defaultMessage: 'The little sprite did not answer. Please try again later.',
	},
	outOf: { id: 'app.home.luck.out-of', defaultMessage: 'out of 100' },
})

const luck = ref<number | null>(null)
const loading = ref(false)
const failed = ref(false)
const waitingForLogin = ref(false)
const signedIn = computed(() => Boolean(skinSiteUser.value))

async function fetchLuck() {
	if (loading.value) return
	loading.value = true
	failed.value = false
	try {
		luck.value = await requestSkinSiteLuck()
	} catch {
		failed.value = true
	} finally {
		loading.value = false
	}
}

function handlePrimaryAction() {
	if (signedIn.value) {
		void fetchLuck()
		return
	}
	waitingForLogin.value = true
	openSkinSiteLogin()
}

watch(
	() => skinSiteUser.value?.uuid,
	(uuid, previousUuid) => {
		if (uuid === previousUuid) return
		luck.value = null
		failed.value = false
		if (uuid && waitingForLogin.value) {
			waitingForLogin.value = false
			void fetchLuck()
		} else if (!uuid) {
			waitingForLogin.value = false
		}
	},
)
</script>

<template>
	<section
		class="flex min-w-0 flex-col gap-3 border-0 border-b-[1px] border-solid border-[--brand-gradient-border] p-4"
	>
		<div class="flex items-center gap-2">
			<LuckyCloverIcon class="lucky-clover size-5 shrink-0" aria-hidden="true" />
			<h2 class="m-0 truncate text-lg">
				{{ formatMessage(messages.widgetTitle) }}
			</h2>
		</div>

		<div class="flex flex-col gap-3">
			<div v-if="loading" class="luck-feedback" role="status" aria-live="polite">
				<LuckyCloverIcon
					class="lucky-clover lucky-clover-loading size-7 shrink-0"
					aria-hidden="true"
				/>
				<span>{{ formatMessage(messages.loading) }}</span>
			</div>
			<div v-else-if="luck !== null" class="luck-feedback" aria-live="polite">
				<strong class="text-3xl leading-none text-contrast">{{ luck }}</strong>
				<span class="text-xs text-secondary">{{ formatMessage(messages.outOf) }}</span>
			</div>
			<p v-else-if="failed" class="m-0 text-sm leading-5 text-secondary" role="alert">
				{{ formatMessage(messages.error) }}
			</p>

			<ButtonStyled color="brand" class="w-full">
				<button type="button" class="w-full" :disabled="loading" @click="handlePrimaryAction">
					{{ formatMessage(signedIn ? messages.getLuck : messages.loginToGet) }}
				</button>
			</ButtonStyled>
		</div>
	</section>
</template>

<style scoped>
.lucky-clover {
	--clover-leaf: color-mix(in srgb, #42c95a 88%, var(--color-brand));
	--clover-edge: color-mix(in srgb, #16883f 88%, var(--color-brand));
}

.luck-feedback {
	display: flex;
	min-height: 2.75rem;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	font-weight: 600;
	color: var(--color-secondary);
	text-align: center;
}

.lucky-clover-loading {
	transform-origin: center;
	animation: clover-wait 850ms ease-in-out infinite;
}

@keyframes clover-wait {
	0%,
	100% {
		transform: translateY(1px) rotate(-5deg) scale(0.96);
	}
	50% {
		transform: translateY(-2px) rotate(6deg) scale(1.04);
	}
}

@media (prefers-reduced-motion: reduce) {
	.lucky-clover-loading {
		animation: none;
	}
}
</style>
