<script setup lang="ts">
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { type SkinSiteChatUserInfo, skinSiteChatUserSearch } from '@/helpers/skin-site-api'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const props = withDefaults(
	defineProps<{
		roomId?: number
		label?: string
		placeholder?: string
		excludeUuids?: string[]
		allowedUuids?: string[]
		allowedHint?: string
	}>(),
	{
		roomId: undefined,
		label: undefined,
		placeholder: undefined,
		excludeUuids: () => [],
		allowedUuids: undefined,
		allowedHint: undefined,
	},
)

const model = defineModel<SkinSiteChatUserInfo | null>({ required: true })

const messages = defineMessages({
	label: { id: 'app.skin-site.chat.user-picker.label', defaultMessage: 'Pick a user' },
	placeholder: {
		id: 'app.skin-site.chat.user-picker.placeholder',
		defaultMessage: 'Search username, email or account ID',
	},
	byUser: { id: 'app.skin-site.chat.user-picker.by-user', defaultMessage: 'By user' },
	byPlayer: { id: 'app.skin-site.chat.user-picker.by-player', defaultMessage: 'By player' },
	hint: {
		id: 'app.skin-site.chat.user-picker.hint',
		defaultMessage: 'Fuzzy search on username and email, or search by account ID.',
	},
	playerHint: {
		id: 'app.skin-site.chat.user-picker.player-hint',
		defaultMessage: 'Enter a player name to find the bound user.',
	},
	empty: {
		id: 'app.skin-site.chat.user-picker.empty',
		defaultMessage: 'No matching user.',
	},
	banned: {
		id: 'app.skin-site.chat.user-picker.banned',
		defaultMessage: 'This account is banned.',
	},
	guest: {
		id: 'app.skin-site.chat.user-picker.guest',
		defaultMessage: 'Guests cannot become a manager or settlement owner.',
	},
	alreadyIn: {
		id: 'app.skin-site.chat.user-picker.already-in',
		defaultMessage: 'This user is already in the room.',
	},
	notAllowed: {
		id: 'app.skin-site.chat.user-picker.not-allowed',
		defaultMessage: 'This user is outside the allowed range.',
	},
	select: { id: 'app.skin-site.chat.user-picker.select', defaultMessage: 'Select' },
	selected: {
		id: 'app.skin-site.chat.user-picker.selected',
		defaultMessage: 'Selected',
	},
	idLabel: { id: 'app.skin-site.chat.user-picker.id', defaultMessage: 'ID' },
})

const keyword = ref('')
const searchMode = ref<'user' | 'player'>('user')
const results = ref<SkinSiteChatUserInfo[]>([])
const preview = ref<SkinSiteChatUserInfo | null>(null)
const loading = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined
let requestId = 0

const currentLabel = computed(() => props.label ?? formatMessage(messages.label))
const currentPlaceholder = computed(
	() => props.placeholder ?? formatMessage(messages.placeholder),
)

watch([keyword, searchMode], () => {
	clearTimeout(timer)
	const query = keyword.value.trim()
	if (!query) {
		results.value = []
		preview.value = null
		loading.value = false
		return
	}
	timer = setTimeout(() => void search(query), 300)
})

watch(model, (value) => {
	if (value) return
	keyword.value = ''
	preview.value = null
	results.value = []
})

watch(
	() => props.roomId,
	() => {
		model.value = null
	},
)

onBeforeUnmount(() => clearTimeout(timer))

async function search(query: string) {
	const current = ++requestId
	loading.value = true
	try {
		const res = await skinSiteChatUserSearch(query, props.roomId, searchMode.value)
		if (current !== requestId) return
		if (!res.success) throw new Error(res.errorMessage)
		results.value = res.payload ?? []
		preview.value = results.value.length === 1 ? results.value[0] : null
	} catch (error) {
		if (current === requestId) {
			results.value = []
			handleError(error)
		}
	} finally {
		if (current === requestId) loading.value = false
	}
}

function unavailableReason(user: SkinSiteChatUserInfo): string | null {
	if (user.banned) return formatMessage(messages.banned)
	if (user.permissions.includes('GUEST')) return formatMessage(messages.guest)
	if (props.excludeUuids.includes(user.uuid)) return formatMessage(messages.alreadyIn)
	if (props.allowedUuids && !props.allowedUuids.includes(user.uuid)) {
		return props.allowedHint ?? formatMessage(messages.notAllowed)
	}
	return null
}

function selectPreview() {
	if (preview.value && !unavailableReason(preview.value)) {
		model.value = preview.value
	}
}

function formatTime(ts: number): string {
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return '—'
	}
}
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-semibold text-secondary">{{ currentLabel }}</span>
			<div class="flex gap-2">
				<select
					v-model="searchMode"
					class="shrink-0 rounded-lg border border-solid border-surface-5 bg-bg-raised px-2 py-1.5 text-xs text-contrast outline-none focus:border-brand"
				>
					<option value="user">{{ formatMessage(messages.byUser) }}</option>
					<option value="player">{{ formatMessage(messages.byPlayer) }}</option>
				</select>
				<input
					v-model.trim="keyword"
					type="text"
					maxlength="100"
					:placeholder="searchMode === 'player' ? formatMessage(messages.playerHint) : currentPlaceholder"
					class="min-w-0 flex-1 rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-1.5 text-xs text-contrast outline-none focus:border-brand"
					autocomplete="off"
				/>
			</div>
			<span class="text-[11px] text-secondary">
				{{ searchMode === 'player' ? formatMessage(messages.playerHint) : formatMessage(messages.hint) }}
			</span>
		</div>

		<div
			v-if="keyword && !loading"
			class="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-lg border border-solid border-surface-5 bg-bg-raised p-2"
		>
			<button
				v-for="user in results"
				:key="user.uuid"
				type="button"
				class="flex w-full items-center justify-between gap-3 rounded-lg border border-solid p-2 text-left transition-colors"
				:class="
					preview?.uuid === user.uuid
						? 'border-brand bg-brand/10'
						: 'border-transparent bg-bg hover:border-surface-5'
				"
				@click="preview = user"
			>
				<span class="flex min-w-0 items-center gap-2">
					<span class="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-xs font-bold text-brand">
						{{ user.username.slice(0, 1).toUpperCase() }}
					</span>
					<span class="min-w-0">
						<strong class="block truncate text-xs text-contrast">{{ user.username }}</strong>
						<span class="block truncate text-[10px] text-secondary">
							{{ formatMessage(messages.idLabel) }} {{ user.id }} · {{ user.email }}
						</span>
					</span>
				</span>
				<span
					v-if="unavailableReason(user)"
					class="shrink-0 rounded-full bg-red/20 px-2 py-0.5 text-[10px] font-semibold text-red"
				>
					{{ unavailableReason(user) }}
				</span>
				<span
					v-else-if="model?.uuid === user.uuid"
					class="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-contrast"
				>
					{{ formatMessage(messages.selected) }}
				</span>
			</button>
			<p v-if="!results.length" class="m-0 py-4 text-center text-xs text-secondary">
				{{ formatMessage(messages.empty) }}
			</p>
		</div>

		<section
			v-if="preview"
			class="flex flex-col gap-3 rounded-lg border border-solid border-surface-5 bg-bg-raised p-3"
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<h3 class="m-0 text-sm font-bold text-contrast">{{ preview.username }}</h3>
					<p class="m-0 text-[11px] text-secondary">
						{{ formatMessage(messages.idLabel) }} {{ preview.id }}
					</p>
				</div>
				<span
					class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
					:class="preview.banned ? 'bg-red text-contrast' : 'bg-green text-contrast'"
				>
					{{ preview.banned ? 'Banned' : 'OK' }}
				</span>
			</div>
			<div class="grid gap-2 text-[11px] sm:grid-cols-2">
				<div class="min-w-0">
					<span class="block text-secondary">UUID</span>
					<span class="block break-all font-mono text-contrast">{{ preview.uuid }}</span>
				</div>
				<div>
					<span class="block text-secondary">Email</span>
					<span class="block break-all text-contrast">{{ preview.email }}</span>
				</div>
				<div>
					<span class="block text-secondary">QQ</span>
					<span class="block text-contrast">{{ preview.qq ?? '—' }}</span>
				</div>
				<div>
					<span class="block text-secondary">Registered</span>
					<span class="block text-contrast">{{ formatTime(preview.registerTime) }}</span>
				</div>
			</div>
			<div class="flex flex-wrap gap-1.5">
				<span
					v-for="perm in preview.permissions"
					:key="perm"
					class="rounded bg-bg px-2 py-0.5 font-mono text-[10px] text-secondary"
				>
					{{ perm }}
				</span>
			</div>
			<p v-if="unavailableReason(preview)" class="m-0 text-[11px] text-red">
				{{ unavailableReason(preview) }}
			</p>
			<button
				type="button"
				class="w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
				:disabled="Boolean(unavailableReason(preview))"
				@click="selectPreview"
			>
				{{ model?.uuid === preview.uuid ? formatMessage(messages.selected) : formatMessage(messages.select) }}
			</button>
		</section>
	</div>
</template>
