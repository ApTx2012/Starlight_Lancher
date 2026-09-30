<script setup lang="ts">
import { NewspaperIcon, RightArrowIcon } from '@modrinth/assets'
import { inject } from 'vue'

const showAnnouncement = inject<(() => void) | undefined>('showStartupAnnouncement')

function open() {
	showAnnouncement?.()
}
</script>

<template>
	<section
		class="flex min-w-0 flex-col gap-3 border-0 border-b-[1px] border-solid border-[--brand-gradient-border] p-4"
	>
		<button
			type="button"
			class="group flex w-full cursor-pointer flex-col gap-2 border-0 bg-transparent p-0 text-left"
			@click="open"
		>
			<div class="flex items-center gap-2">
				<NewspaperIcon class="size-4 shrink-0 text-secondary" aria-hidden="true" />
				<h2 class="m-0 truncate text-lg">公告</h2>
				<RightArrowIcon
					class="ml-auto size-4 shrink-0 text-secondary transition-transform group-hover:translate-x-0.5"
					aria-hidden="true"
				/>
			</div>
			<p class="m-0 text-sm leading-relaxed text-secondary">点击查看最新公告</p>
		</button>
	</section>
</template>