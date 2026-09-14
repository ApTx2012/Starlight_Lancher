<template>
	<div
		class="management-switch relative isolate mb-4 flex w-full max-w-[26rem] rounded-xl bg-surface-1 p-1"
		:data-packs="selected === 'packs'"
		role="group"
		:aria-label="formatMessage(messages.label)"
	>
		<span
			class="selection absolute inset-y-1 left-1 -z-10 w-[calc(50%_-_4px)] rounded-lg bg-surface-3 shadow-sm"
			aria-hidden="true"
		/>
		<button
			class="flex-1 cursor-pointer border-0 bg-transparent px-4 py-2.5 font-semibold text-base aria-pressed:text-contrast"
			type="button"
			:aria-pressed="selected === 'mods'"
			@click="select('mods')"
		>
			{{ formatMessage(messages.mods) }}
		</button>
		<button
			class="flex-1 cursor-pointer border-0 bg-transparent px-4 py-2.5 font-semibold text-base aria-pressed:text-contrast"
			type="button"
			:aria-pressed="selected === 'packs'"
			@click="select('packs')"
		>
			{{ formatMessage(messages.packs) }}
		</button>
	</div>
	<div v-show="selected === 'mods'"><slot /></div>
	<div v-if="openedPacks" v-show="selected === 'packs'"><slot name="packs" /></div>
</template>
<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'
const { formatMessage } = useVIntl()
const messages = defineMessages({
	label: { id: 'app.hosted-packs.management', defaultMessage: 'Content management' },
	mods: { id: 'app.hosted-packs.mods', defaultMessage: 'Manage mods' },
	packs: { id: 'app.hosted-packs.packs', defaultMessage: 'Manage modpacks' },
})
const key = 'starlight:instance:mod-management-tab'
function initial(): 'mods' | 'packs' {
	try {
		return localStorage.getItem(key) === 'packs' ? 'packs' : 'mods'
	} catch {
		return 'mods'
	}
}
const selected = ref(initial())
const openedPacks = ref(selected.value === 'packs')
function select(value: 'mods' | 'packs') {
	selected.value = value
	if (value === 'packs') openedPacks.value = true
	try {
		localStorage.setItem(key, value)
	} catch {
		/* Selection remains usable without storage. */
	}
}
</script>
<style scoped>
.selection {
	transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
[data-packs='true'] .selection {
	transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
	.selection {
		transition: none;
	}
}
</style>
