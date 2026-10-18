<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { loadCachedRoomAvatar } from './room-avatar-cache'

const props = withDefaults(
	defineProps<{
		roomId: number
		avatarAttachmentId?: number | null
		name: string
		size?: 'sm' | 'md' | 'lg' | 'xl'
	}>(),
	{ avatarAttachmentId: null, size: 'md' },
)

const avatarUrl = ref<string | null>(null)
const loading = ref(false)

const sizeClass = computed(
	() =>
		({
			sm: 'size-9 rounded-lg text-lg',
			md: 'size-10 rounded-lg text-xl',
			lg: 'size-12 rounded-lg text-2xl',
			xl: 'size-20 rounded-xl text-3xl',
		})[props.size],
)

watch(
	() => [props.roomId, props.avatarAttachmentId] as const,
	async ([roomId, attachmentId]) => {
		avatarUrl.value = null
		if (!attachmentId) {
			loading.value = false
			return
		}
		loading.value = true
		const url = await loadCachedRoomAvatar(roomId, attachmentId)
		if (props.roomId === roomId && props.avatarAttachmentId === attachmentId) {
			avatarUrl.value = url
		}
		loading.value = false
	},
	{ immediate: true },
)
</script>

<template>
	<div
		class="grid shrink-0 place-items-center overflow-hidden border border-solid border-surface-5 bg-brand/10 font-bold text-brand"
		:class="sizeClass"
	>
		<img
			v-if="avatarUrl"
			:src="avatarUrl"
			:alt="name"
			class="h-full w-full object-cover"
			decoding="async"
		/>
		<span v-else-if="loading" class="text-[10px] text-secondary">…</span>
		<span v-else class="select-none">#</span>
	</div>
</template>
