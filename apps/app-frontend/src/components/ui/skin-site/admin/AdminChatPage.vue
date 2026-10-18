<script setup lang="ts">
import { SpinnerIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import {
	type SkinSiteChatPrerequisiteMode,
	type SkinSiteChatRoomInfo,
	type SkinSiteChatRoomVisibility,
	skinSiteChatRoomAvatarUpdate,
	skinSiteChatRoomCreate,
	skinSiteChatRoomDelete,
	skinSiteChatRoomList,
	skinSiteChatRoomUpdate,
} from '@/helpers/skin-site-api'

import RoomAvatar from '../RoomAvatar.vue'
import RoomAvatarEditor from '../RoomAvatarEditor.vue'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.chat.admin.title', defaultMessage: 'Chat rooms' },
	subtitle: {
		id: 'app.skin-site.chat.admin.subtitle',
		defaultMessage: 'Create public or private rooms and hand daily moderation to trusted members.',
	},
	createRoom: {
		id: 'app.skin-site.chat.admin.create-room',
		defaultMessage: 'Create room',
	},
	loading: { id: 'app.skin-site.chat.admin.loading', defaultMessage: 'Loading…' },
	failed: { id: 'app.skin-site.chat.admin.failed', defaultMessage: 'Could not load rooms.' },
	empty: { id: 'app.skin-site.chat.admin.empty', defaultMessage: 'No chat rooms yet.' },
	edit: { id: 'app.skin-site.chat.admin.edit', defaultMessage: 'Edit' },
	remove: { id: 'app.skin-site.chat.admin.remove', defaultMessage: 'Delete' },
	save: { id: 'app.skin-site.chat.admin.save', defaultMessage: 'Save' },
	cancel: { id: 'app.skin-site.chat.admin.cancel', defaultMessage: 'Cancel' },
	name: { id: 'app.skin-site.chat.admin.name', defaultMessage: 'Name' },
	description: {
		id: 'app.skin-site.chat.admin.description',
		defaultMessage: 'Description',
	},
	visibility: {
		id: 'app.skin-site.chat.admin.visibility',
		defaultMessage: 'Visibility',
	},
	visibilityPublic: {
		id: 'app.skin-site.chat.admin.visibility-public',
		defaultMessage: 'Public',
	},
	visibilityPrivate: {
		id: 'app.skin-site.chat.admin.visibility-private',
		defaultMessage: 'Private',
	},
	kind: { id: 'app.skin-site.chat.admin.kind', defaultMessage: 'Kind' },
	kindStandard: {
		id: 'app.skin-site.chat.admin.kind-standard',
		defaultMessage: 'Standard',
	},
	kindSettlement: {
		id: 'app.skin-site.chat.admin.kind-settlement',
		defaultMessage: 'Settlement',
	},
	prerequisiteMode: {
		id: 'app.skin-site.chat.admin.prerequisite-mode',
		defaultMessage: 'Prerequisite mode',
	},
	prerequisiteAny: {
		id: 'app.skin-site.chat.admin.prerequisite-any',
		defaultMessage: 'Any',
	},
	prerequisiteAll: {
		id: 'app.skin-site.chat.admin.prerequisite-all',
		defaultMessage: 'All',
	},
	prerequisitePermissions: {
		id: 'app.skin-site.chat.admin.prerequisite-permissions',
		defaultMessage: 'Required permissions',
	},
	prerequisiteHint: {
		id: 'app.skin-site.chat.admin.prerequisite-hint',
		defaultMessage: 'Comma separated. Leave empty for no restriction.',
	},
	created: { id: 'app.skin-site.chat.admin.created', defaultMessage: 'Room created.' },
	updated: { id: 'app.skin-site.chat.admin.updated', defaultMessage: 'Room updated.' },
	deleted: { id: 'app.skin-site.chat.admin.deleted', defaultMessage: 'Room deleted.' },
	confirmDelete: {
		id: 'app.skin-site.chat.admin.confirm-delete',
		defaultMessage: 'Permanently delete room “{name}” and all its messages?',
	},
	managerBadge: {
		id: 'app.skin-site.chat.admin.manager-badge',
		defaultMessage: 'Manager',
	},
	voiceBadge: {
		id: 'app.skin-site.chat.admin.voice-badge',
		defaultMessage: 'Voice',
	},
})

type FormState = {
	name: string
	description: string
	visibility: SkinSiteChatRoomVisibility
	kind: 'STANDARD' | 'SETTLEMENT'
	prerequisiteMode: SkinSiteChatPrerequisiteMode
	prerequisitePermissions: string
}

function emptyForm(): FormState {
	return {
		name: '',
		description: '',
		visibility: 'PUBLIC',
		kind: 'STANDARD',
		prerequisiteMode: 'ANY',
		prerequisitePermissions: '',
	}
}

const rooms = ref<SkinSiteChatRoomInfo[]>([])
const loading = ref(true)
const failed = ref(false)

const editorOpen = ref(false)
const editingRoom = ref<SkinSiteChatRoomInfo | null>(null)
const form = ref<FormState>(emptyForm())
const saving = ref(false)

const avatarToken = ref<string | null>(null)
const avatarRemove = ref(false)
const avatarUploading = ref(false)

const deletingId = ref<number | null>(null)

const editorTitle = computed(() =>
	editingRoom.value
		? formatMessage(messages.edit)
		: formatMessage(messages.createRoom),
)

function permissionsToText(list: string[]): string {
	return list.join(', ')
}

function textToPermissions(text: string): string[] {
	return text
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

function resetAvatarDraft() {
	avatarToken.value = null
	avatarRemove.value = false
	avatarUploading.value = false
}

async function loadRooms() {
	loading.value = true
	failed.value = false
	try {
		const res = await skinSiteChatRoomList()
		if (!res.success) throw new Error(res.errorMessage)
		rooms.value = res.payload ?? []
	} catch (error) {
		failed.value = true
		handleError(error)
	} finally {
		loading.value = false
	}
}

function openCreate() {
	editingRoom.value = null
	form.value = emptyForm()
	resetAvatarDraft()
	editorOpen.value = true
}

function openEdit(room: SkinSiteChatRoomInfo) {
	editingRoom.value = room
	form.value = {
		name: room.name,
		description: room.description ?? '',
		visibility: room.visibility,
		kind: room.kind,
		prerequisiteMode: room.prerequisiteMode,
		prerequisitePermissions: permissionsToText(room.prerequisitePermissions ?? []),
	}
	resetAvatarDraft()
	editorOpen.value = true
}

function closeEditor() {
	editorOpen.value = false
	editingRoom.value = null
	resetAvatarDraft()
}

async function submit() {
	if (saving.value) return
	if (!form.value.name.trim()) return
	saving.value = true
	const creating = editingRoom.value === null
	try {
		const payload = {
			name: form.value.name.trim(),
			description: form.value.description.trim(),
			visibility: form.value.visibility,
			prerequisiteMode: form.value.prerequisiteMode,
			prerequisitePermissions: textToPermissions(form.value.prerequisitePermissions),
		}
		const res = creating
			? await skinSiteChatRoomCreate({ ...payload, kind: form.value.kind })
			: await skinSiteChatRoomUpdate(editingRoom.value!.id, payload)
		if (!res.success) throw new Error(res.errorMessage)

		if (avatarToken.value || avatarRemove.value) {
			const avatarRes = await skinSiteChatRoomAvatarUpdate(res.payload.id, {
				imageToken: avatarToken.value ?? undefined,
				removeImage: avatarRemove.value,
			})
			if (!avatarRes.success) {
				addNotification({ type: 'error', title: avatarRes.errorMessage })
				await loadRooms()
				return
			}
		}

		addNotification({
			type: 'success',
			title: formatMessage(creating ? messages.created : messages.updated),
		})
		closeEditor()
		await loadRooms()
	} catch (error) {
		handleError(error)
	} finally {
		saving.value = false
	}
}

async function removeRoom(room: SkinSiteChatRoomInfo) {
	if (deletingId.value !== null) return
	if (!window.confirm(formatMessage(messages.confirmDelete, { name: room.name }))) return
	deletingId.value = room.id
	try {
		const res = await skinSiteChatRoomDelete(room.id)
		if (!res.success) throw new Error(res.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.deleted) })
		await loadRooms()
	} catch (error) {
		handleError(error)
	} finally {
		deletingId.value = null
	}
}

function formatDateTime(ts?: number | null): string {
	if (!ts) return '—'
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return '—'
	}
}

onMounted(() => void loadRooms())
</script>

<template>
	<div class="flex w-full flex-col gap-4">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 class="m-0 text-xl font-bold text-contrast">{{ formatMessage(messages.title) }}</h2>
				<p class="m-0 mt-1 max-w-xl text-sm text-secondary">
					{{ formatMessage(messages.subtitle) }}
				</p>
			</div>
			<button
				type="button"
				class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
				@click="openCreate"
			>
				{{ formatMessage(messages.createRoom) }}
			</button>
		</div>

		<div
			v-if="loading"
			class="flex min-h-48 items-center justify-center gap-2 text-sm text-secondary"
		>
			<SpinnerIcon class="size-4 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>
		<p
			v-else-if="failed"
			class="m-0 rounded-lg border border-solid border-surface-5 bg-bg-raised p-4 text-sm text-secondary"
		>
			{{ formatMessage(messages.failed) }}
		</p>
		<p
			v-else-if="!rooms.length"
			class="m-0 rounded-lg border border-solid border-surface-5 bg-bg-raised p-4 text-sm text-secondary"
		>
			{{ formatMessage(messages.empty) }}
		</p>
		<div v-else class="grid gap-3 lg:grid-cols-2">
			<article
				v-for="room in rooms"
				:key="room.id"
				class="flex flex-col gap-3 rounded-xl border border-solid border-surface-5 bg-bg-raised p-4"
			>
				<div class="flex items-start gap-3">
					<RoomAvatar
						:room-id="room.id"
						:avatar-attachment-id="room.avatarAttachmentId"
						:name="room.name"
						size="lg"
					/>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="m-0 truncate text-base font-bold text-contrast">{{ room.name }}</h3>
							<span
								class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
								:class="
									room.visibility === 'PUBLIC'
										? 'bg-brand text-contrast'
										: 'bg-button-bg text-secondary'
								"
							>
								{{
									room.visibility === 'PUBLIC'
										? formatMessage(messages.visibilityPublic)
										: formatMessage(messages.visibilityPrivate)
								}}
							</span>
							<span
								v-if="room.kind === 'SETTLEMENT'"
								class="rounded-full bg-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-yellow"
							>
								{{ formatMessage(messages.kindSettlement) }}
							</span>
							<span
								v-if="room.voiceEnabled"
								class="rounded-full bg-green/20 px-2 py-0.5 text-[10px] font-semibold text-green"
							>
								{{ formatMessage(messages.voiceBadge) }}
							</span>
						</div>
						<p
							v-if="room.description"
							class="m-0 mt-1 line-clamp-2 text-xs whitespace-pre-wrap text-secondary"
						>
							{{ room.description }}
						</p>
						<p class="m-0 mt-1 text-[11px] text-secondary">
							{{ formatDateTime(room.createdAt) }}
						</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<span
						v-for="perm in room.prerequisitePermissions"
						:key="perm"
						class="rounded bg-bg px-2 py-0.5 font-mono text-[10px] text-secondary"
					>
						{{ perm }}
					</span>
					<button
						type="button"
						class="ml-auto rounded-lg bg-button-bg px-3 py-1 text-xs font-semibold text-contrast hover:brightness-110"
						@click="openEdit(room)"
					>
						{{ formatMessage(messages.edit) }}
					</button>
					<button
						type="button"
						class="rounded-lg bg-red/20 px-3 py-1 text-xs font-semibold text-red hover:brightness-110 disabled:opacity-50"
						:disabled="deletingId === room.id"
						@click="removeRoom(room)"
					>
						{{ formatMessage(messages.remove) }}
					</button>
				</div>
			</article>
		</div>

		<div
			v-if="editorOpen"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="closeEditor"
		>
			<div
				class="flex max-h-[88vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-xl bg-bg p-6"
			>
				<h3 class="m-0 text-lg font-bold text-contrast">{{ editorTitle }}</h3>

				<label class="flex flex-col gap-1">
					<span class="text-xs font-semibold text-secondary">
						{{ formatMessage(messages.name) }}
					</span>
					<input
						v-model="form.name"
						type="text"
						maxlength="80"
						class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
					/>
				</label>

				<label class="flex flex-col gap-1">
					<span class="text-xs font-semibold text-secondary">
						{{ formatMessage(messages.description) }}
					</span>
					<textarea
						v-model="form.description"
						rows="3"
						maxlength="500"
						class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
					></textarea>
				</label>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-secondary">
							{{ formatMessage(messages.visibility) }}
						</span>
						<select
							v-model="form.visibility"
							class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						>
							<option value="PUBLIC">{{ formatMessage(messages.visibilityPublic) }}</option>
							<option value="PRIVATE">{{ formatMessage(messages.visibilityPrivate) }}</option>
						</select>
					</label>
					<label v-if="!editingRoom" class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-secondary">
							{{ formatMessage(messages.kind) }}
						</span>
						<select
							v-model="form.kind"
							class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
						>
							<option value="STANDARD">{{ formatMessage(messages.kindStandard) }}</option>
							<option value="SETTLEMENT">{{ formatMessage(messages.kindSettlement) }}</option>
						</select>
					</label>
				</div>

				<RoomAvatarEditor
					v-model:token="avatarToken"
					v-model:remove="avatarRemove"
					v-model:uploading="avatarUploading"
					:room-id="editingRoom?.id ?? 0"
					:avatar-attachment-id="editingRoom?.avatarAttachmentId ?? null"
					:name="form.name"
				/>

				<div class="flex flex-col gap-2 rounded-lg border border-solid border-surface-5 p-3">
					<div class="flex flex-wrap items-end gap-3">
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-secondary">
								{{ formatMessage(messages.prerequisiteMode) }}
							</span>
							<select
								v-model="form.prerequisiteMode"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
							>
								<option value="ANY">{{ formatMessage(messages.prerequisiteAny) }}</option>
								<option value="ALL">{{ formatMessage(messages.prerequisiteAll) }}</option>
							</select>
						</label>
						<label class="flex flex-1 flex-col gap-1">
							<span class="text-xs font-semibold text-secondary">
								{{ formatMessage(messages.prerequisitePermissions) }}
							</span>
							<input
								v-model="form.prerequisitePermissions"
								type="text"
								class="rounded-lg border border-solid border-surface-5 bg-bg px-2 py-1 text-xs text-contrast outline-none focus:border-brand"
							/>
						</label>
					</div>
					<p class="m-0 text-[11px] text-secondary">
						{{ formatMessage(messages.prerequisiteHint) }}
					</p>
				</div>

				<div class="flex justify-end gap-2 border-t border-solid border-surface-5 pt-3">
					<button
						type="button"
						class="rounded-lg bg-button-bg px-4 py-2 text-sm font-semibold text-secondary hover:brightness-110 disabled:opacity-50"
						:disabled="saving"
						@click="closeEditor"
					>
						{{ formatMessage(messages.cancel) }}
					</button>
					<button
						type="button"
						class="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110 disabled:opacity-50"
						:disabled="saving || !form.name.trim() || avatarUploading"
						@click="submit"
					>
						{{ formatMessage(messages.save) }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
