<template>
	<div aria-label="Starlight" class="flex h-full items-center gap-2 font-extrabold text-contrast">
		<img aria-hidden="true" class="aspect-square h-full object-contain" :src="axolotlVisual" />
		<span v-if="!iconOnly" class="hidden text-sm tracking-wide xl:inline">Starlight</span>
	</div>
</template>

<script setup lang="ts">
import axolotlVisual from '@modrinth/assets/branding/netherstar.png'

defineProps<{
	iconOnly?: boolean
}>()
</script>
