<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
	title: string
	description?: string | null
	variant?: string | null
}>()

const variantClass = computed(() => {
	switch (props.variant) {
		case 'warning':
			return 'border-yellow/40 bg-yellow/10 text-yellow'
		case 'error':
			return 'border-red/40 bg-red/10 text-red'
		case 'success':
			return 'border-green/40 bg-green/10 text-green'
		default:
			return 'border-brand/40 bg-brand/10 text-brand'
	}
})
</script>

<template>
	<div class="my-4 rounded-lg border border-solid p-4" :class="variantClass">
		<p class="m-0 text-sm font-bold">{{ title }}</p>
		<p v-if="description" class="m-0 mt-1 text-xs whitespace-pre-wrap opacity-90">
			{{ description }}
		</p>
		<slot />
	</div>
</template>
