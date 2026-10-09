<script setup lang="ts">
import { RightArrowIcon, ShieldIcon } from '@modrinth/assets'
import { computed } from 'vue'

import { defineMessages, useVIntl } from '#ui/composables/i18n'
import type { ArmorPreviewConfig } from '#ui/composables/skin-rendering'

const messages = defineMessages({
	armorPreview: { id: 'skin.preview.armor.open', defaultMessage: 'Armor and trims' },
})

const { open = false, panelId } = defineProps<{
	/** Whether the panel this button toggles is currently open. */
	open?: boolean
	/** id of the panel this toggle controls, wired to `aria-controls`. */
	panelId?: string
}>()

const emit = defineEmits<{
	(e: 'open' | 'close'): void
}>()

// Kept for API compatibility with the upstream component; the model is owned by
// the panel (ArmorTrimTab) rather than this toggle.
defineModel<ArmorPreviewConfig>({ required: false })

const { formatMessage } = useVIntl()

/**
 * The shield flips about its centre axis into a right arrow while the panel is
 * open, so the same button reads as "back to the list" and closes it.
 */
const isFlipped = computed(() => open)
</script>

<template>
	<div class="pointer-events-auto">
		<button
			class="flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 bg-surface-4 px-4 py-2.5 text-base font-semibold leading-5 shadow-md transition-[filter,transform] duration-200 hover:brightness-[--hover-brightness] focus-visible:brightness-[--hover-brightness] active:scale-95 [&>svg]:size-5 [&>svg]:shrink-0"
			:aria-label="formatMessage(messages.armorPreview)"
			:aria-expanded="open"
			:aria-controls="panelId"
			@click="open ? emit('close') : emit('open')"
		>
			<span class="relative size-5 shrink-0">
				<ShieldIcon
					aria-hidden="true"
					class="absolute inset-0 size-5 transition-[transform,opacity] duration-200 ease-out"
					:class="isFlipped ? 'scale-x-0 opacity-0' : 'scale-x-100'"
				/>
				<RightArrowIcon
					aria-hidden="true"
					class="absolute inset-0 size-5 transition-[transform,opacity] duration-200 ease-out"
					:class="isFlipped ? 'scale-x-100' : 'scale-x-0 opacity-0'"
				/>
			</span>
			<span>{{ formatMessage(messages.armorPreview) }}</span>
		</button>
	</div>
</template>