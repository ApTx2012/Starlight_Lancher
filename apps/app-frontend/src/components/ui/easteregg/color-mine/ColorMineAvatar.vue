<script setup lang="ts">
import { Avatar } from '@modrinth/ui'
import { onScopeDispose, ref } from 'vue'

defineProps<{ src: string; name: string; href?: string }>()
const emit = defineEmits<{ activate: [] }>()
const holding = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let origin = { x: 0, y: 0 }
let suppressClick = false

function cancel() {
	clearTimeout(timer)
	timer = undefined
	holding.value = false
}
function begin() {
	cancel()
	suppressClick = false
	holding.value = true
	timer = setTimeout(() => {
		cancel()
		suppressClick = true
		emit('activate')
	}, 800)
}
function pointerDown(event: PointerEvent) {
	if (event.button !== 0 || !event.isPrimary) return
	origin = { x: event.clientX, y: event.clientY }
	begin()
}
function pointerMove(event: PointerEvent) {
	if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) cancel()
}
function click(event: MouseEvent) {
	if (!suppressClick) return
	event.preventDefault()
	event.stopPropagation()
	suppressClick = false
}
function keydown(event: KeyboardEvent) {
	if (event.code === 'Space') {
		event.preventDefault()
		if (!event.repeat) begin()
	}
}
window.addEventListener('blur', cancel)
onScopeDispose(() => {
	cancel()
	window.removeEventListener('blur', cancel)
})
</script>

<template>
	<a
		:href="href"
		target="_blank"
		rel="noopener noreferrer"
		class="mine-avatar"
		:class="{ holding }"
		@pointerdown="pointerDown"
		@pointermove="pointerMove"
		@pointerup="cancel"
		@pointercancel="cancel"
		@pointerleave="cancel"
		@blur="cancel"
		@click="click"
		@contextmenu.prevent
		@dragstart.prevent
		@keydown="keydown"
		@keyup.space.prevent="cancel"
	>
		<Avatar :src="src" :alt="name" size="2.5rem" circle no-shadow loading="lazy" />
	</a>
</template>

<style scoped>
.mine-avatar {
	display: inline-flex;
	flex-shrink: 0;
	border-radius: 50%;
	user-select: none;
	touch-action: manipulation;
}
.mine-avatar.holding {
	outline: 2px solid var(--color-brand);
	outline-offset: 3px;
}
.mine-avatar:focus-visible {
	outline: 2px solid var(--color-contrast);
	outline-offset: 3px;
}
</style>
