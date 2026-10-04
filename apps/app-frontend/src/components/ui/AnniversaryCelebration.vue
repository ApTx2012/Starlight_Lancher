<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onUnmounted, ref, watch } from 'vue'

import { anniversaryYear, ordinal, shouldCelebrate } from '@/helpers/anniversary'
import { useTheming } from '@/store/state'

const { formatMessage } = useVIntl()
const themeStore = useTheming()

const messages = defineMessages({
	banner: {
		id: 'app.anniversary.banner',
		defaultMessage: 'Happy {ordinal} Anniversary, Starlight!',
	},
})

/** Emoji that drift down from the top of the window. */
const CONFETTI_EMOJI = ['🎂', '🎉', '🎊', '🎈', '✨', '🧁', '🍰']

type Confetti = {
	id: number
	emoji: string
	left: number
	delay: number
	duration: number
	size: number
	drift: number
}

const visible = ref(false)
const years = ref(0)
const confetti = ref<Confetti[]>([])
let spawnTimer: number | undefined
let nextId = 0

function spawnConfetti(): void {
	const emoji = CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)]
	confetti.value.push({
		id: nextId++,
		emoji,
		left: Math.random() * 100,
		delay: 0,
		duration: 6 + Math.random() * 5,
		size: 1 + Math.random() * 1.4,
		drift: (Math.random() - 0.5) * 160,
	})
	// Keep the DOM small; drop the oldest once we exceed a cap.
	if (confetti.value.length > 60) confetti.value.splice(0, 10)
}

const forced = computed(() => themeStore.getFeatureFlag('force_anniversary_celebration'))

function startCelebration(): void {
	if (spawnTimer !== undefined) return
	years.value = anniversaryYear()
	visible.value = true
	// Seed a few so the screen is not empty on the first frame.
	for (let i = 0; i < 12; i++) spawnConfetti()
	spawnTimer = window.setInterval(spawnConfetti, 700)
}

function stopCelebration(): void {
	if (spawnTimer !== undefined) {
		window.clearInterval(spawnTimer)
		spawnTimer = undefined
	}
	confetti.value = []
	visible.value = false
}

watch(
	() => shouldCelebrate(forced.value),
	(active) => (active ? startCelebration() : stopCelebration()),
	{ immediate: true },
)

onUnmounted(stopCelebration)

const bannerText = computed(() =>
	formatMessage(messages.banner, { ordinal: ordinal(years.value) }),
)
</script>

<template>
	<Transition name="anniversary-fade">
		<div v-if="visible" class="anniversary-root" aria-live="polite">
			<!-- Falling confetti layer (click-through). -->
			<div class="anniversary-confetti" aria-hidden="true">
				<span
					v-for="piece in confetti"
					:key="piece.id"
					class="anniversary-piece"
					:style="{
						left: piece.left + '%',
						fontSize: piece.size + 'rem',
						animationDelay: piece.delay + 's',
						animationDuration: piece.duration + 's',
						'--drift': piece.drift + 'px',
					}"
				>
					{{ piece.emoji }}
				</span>
			</div>

			<!-- Top banner. -->
			<div class="anniversary-banner">
				<span class="anniversary-banner-emoji">🎂</span>
				<span class="anniversary-banner-text">{{ bannerText }}</span>
				<span class="anniversary-banner-emoji">🎉</span>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
.anniversary-root {
	position: fixed;
	inset: 0;
	/* Above content, below modals/drag overlays (which use z-[200]). */
	z-index: 150;
	pointer-events: none;
}

.anniversary-confetti {
	position: absolute;
	inset: 0;
	overflow: hidden;
}

.anniversary-piece {
	position: absolute;
	top: -3rem;
	will-change: transform;
	animation-name: anniversary-fall;
	animation-timing-function: linear;
	animation-iteration-count: 1;
	animation-fill-mode: forwards;
}

@keyframes anniversary-fall {
	0% {
		transform: translate3d(0, 0, 0) rotate(0deg);
		opacity: 0;
	}
	10% {
		opacity: 1;
	}
	100% {
		transform: translate3d(var(--drift, 0), 110vh, 0) rotate(360deg);
		opacity: 0.85;
	}
}

.anniversary-banner {
	position: absolute;
	/* 避开原生窗口标题栏（Windows/macOS 系统装饰条会盖住 top:0 的内容）；
	   titlebar-area-height 是 Tauri 暴露的标题栏高度变量，不支持时降级为 0 */
	top: env(titlebar-area-height, 0px);
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 0.4rem 1rem;
	font-weight: 700;
	font-size: 0.95rem;
	letter-spacing: 0.02em;
	color: #fff;
	/* 半透明深色兜底：即使下面的渐变背景失效，白字也不会在浅色页面上隐形 */
	background-color: rgba(20, 16, 28, 0.35);
	/* 半透明彩色渐变：让窗口下方的内容能透出来 */
	background-image: linear-gradient(
		90deg,
		rgba(244, 114, 182, 0.8),
		rgba(250, 204, 21, 0.8),
		rgba(74, 222, 128, 0.8),
		rgba(56, 189, 248, 0.8),
		rgba(167, 139, 250, 0.8),
		rgba(244, 114, 182, 0.8)
	);
	background-size: 300% 100%;
	animation: anniversary-gradient 8s linear infinite;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
	text-shadow:
		0 1px 2px rgba(0, 0, 0, 0.55),
		0 0 4px rgba(0, 0, 0, 0.35);
}

.anniversary-banner-text {
	animation: anniversary-pulse 1.8s ease-in-out infinite;
}

.anniversary-banner-emoji {
	animation: anniversary-bounce 1.4s ease-in-out infinite;
}

@keyframes anniversary-gradient {
	0% {
		background-position: 0% 50%;
	}
	100% {
		background-position: 300% 50%;
	}
}

@keyframes anniversary-pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.06);
	}
}

@keyframes anniversary-bounce {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-3px);
	}
}

.anniversary-fade-enter-active,
.anniversary-fade-leave-active {
	transition: opacity 0.6s ease;
}

.anniversary-fade-enter-from,
.anniversary-fade-leave-to {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	.anniversary-piece,
	.anniversary-banner,
	.anniversary-banner-text,
	.anniversary-banner-emoji {
		animation: none;
	}
}
</style>