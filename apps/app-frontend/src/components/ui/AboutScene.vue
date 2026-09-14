<template>
	<canvas ref="canvas" class="about-scene" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onActivated, onDeactivated, onMounted, onScopeDispose, useTemplateRef, watch } from 'vue'

import { createWitherVictoryScene } from './about-scene/wither-victory'

const props = defineProps<{ paused?: boolean }>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let scene: ReturnType<typeof createWitherVictoryScene> | undefined
let active = true

function updatePlayback() {
	scene?.setPaused(!active || Boolean(props.paused))
}

onMounted(() => {
	if (!canvas.value) return
	scene = createWitherVictoryScene(canvas.value)
	updatePlayback()
	scene.ready.catch((error: unknown) => console.warn('Unable to load about-page scene', error))
})
watch(() => props.paused, updatePlayback)
onActivated(() => {
	active = true
	updatePlayback()
})
onDeactivated(() => {
	active = false
	updatePlayback()
})
onScopeDispose(() => scene?.dispose())
</script>

<style scoped>
.about-scene {
	display: block;
	width: 100%;
	height: 100%;
	background: #0c1729;
}
</style>
