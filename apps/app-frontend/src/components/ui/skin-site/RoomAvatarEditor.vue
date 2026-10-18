<script setup lang="ts">
import { defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onBeforeUnmount, ref, watch } from 'vue'

import { skinSiteChatAttachmentUpload } from '@/helpers/skin-site-api'

import RoomAvatar from './RoomAvatar.vue'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const props = withDefaults(
	defineProps<{
		roomId?: number
		avatarAttachmentId?: number | null
		name: string
		token?: string | null
		remove?: boolean
	}>(),
	{ roomId: 0, avatarAttachmentId: null, token: null, remove: false },
)

const emit = defineEmits<{
	(e: 'update:token', value: string | null): void
	(e: 'update:remove', value: boolean): void
	(e: 'update:uploading', value: boolean): void
}>()

const messages = defineMessages({
	label: { id: 'app.skin-site.chat.avatar.label', defaultMessage: 'Room avatar' },
	upload: { id: 'app.skin-site.chat.avatar.upload', defaultMessage: 'Upload avatar' },
	replace: { id: 'app.skin-site.chat.avatar.replace', defaultMessage: 'Replace avatar' },
	remove: { id: 'app.skin-site.chat.avatar.remove', defaultMessage: 'Remove avatar' },
	hint: {
		id: 'app.skin-site.chat.avatar.hint',
		defaultMessage: 'PNG, JPEG or WebP, up to 8192 px per side and 5 MB.',
	},
	badFormat: {
		id: 'app.skin-site.chat.avatar.bad-format',
		defaultMessage: 'Only PNG, JPEG and WebP are supported.',
	},
	tooLarge: {
		id: 'app.skin-site.chat.avatar.too-large',
		defaultMessage: 'Avatar must not exceed 5 MB.',
	},
	notImage: {
		id: 'app.skin-site.chat.avatar.not-image',
		defaultMessage: 'Avatar must be an image.',
	},
})

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['png', 'jpg', 'jpeg', 'webp']

const uploading = ref(false)
const previewUrl = ref<string | null>(null)

watch(
	() => props.token,
	(token) => {
		if (!token) revokePreview()
	},
)

function revokePreview() {
	if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
	previewUrl.value = null
}

async function selectAvatar(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file) return

	const ext = file.name.split('.').pop()?.toLowerCase()
	if (!ext || !ALLOWED.includes(ext)) {
		addNotification({ type: 'error', title: formatMessage(messages.badFormat) })
		return
	}
	if (file.size > MAX_BYTES) {
		addNotification({ type: 'error', title: formatMessage(messages.tooLarge) })
		return
	}

	uploading.value = true
	emit('update:uploading', true)
	try {
		const res = await skinSiteChatAttachmentUpload(file)
		if (!res.success) throw new Error(res.errorMessage)
		if (res.payload.attachment.kind !== 'IMAGE') {
			addNotification({ type: 'error', title: formatMessage(messages.notImage) })
			return
		}
		revokePreview()
		previewUrl.value = URL.createObjectURL(file)
		emit('update:token', res.payload.token)
		emit('update:remove', false)
	} catch (error) {
		handleError(error)
	} finally {
		uploading.value = false
		emit('update:uploading', false)
	}
}

function removeAvatar() {
	revokePreview()
	emit('update:token', null)
	emit('update:remove', true)
}

onBeforeUnmount(revokePreview)
</script>

<template>
	<div class="flex flex-col gap-2">
		<span class="text-xs font-semibold text-secondary">
			{{ formatMessage(messages.label) }}
		</span>
		<div class="flex flex-wrap items-center gap-3">
			<div
				v-if="previewUrl"
				class="size-20 overflow-hidden rounded-xl border border-solid border-surface-5 bg-bg-raised"
			>
				<img :src="previewUrl" alt="" class="h-full w-full object-cover" />
			</div>
			<RoomAvatar
				v-else
				:room-id="roomId"
				:avatar-attachment-id="remove ? null : avatarAttachmentId"
				:name="name || 'Room'"
				size="xl"
			/>
			<div class="flex flex-wrap gap-2">
				<label
					class="cursor-pointer rounded-lg bg-button-bg px-3 py-1.5 text-xs font-semibold text-contrast hover:brightness-110"
					:class="uploading ? 'pointer-events-none opacity-50' : ''"
				>
					{{ uploading ? '…' : (avatarAttachmentId || previewUrl ? formatMessage(messages.replace) : formatMessage(messages.upload)) }}
					<input
						type="file"
						class="hidden"
						accept=".png,.jpg,.jpeg,.webp"
						@change="selectAvatar"
					/>
				</label>
				<button
					v-if="previewUrl || (avatarAttachmentId && !remove)"
					type="button"
					class="rounded-lg bg-red/20 px-3 py-1.5 text-xs font-semibold text-red hover:brightness-110 disabled:opacity-50"
					:disabled="uploading"
					@click="removeAvatar"
				>
					{{ formatMessage(messages.remove) }}
				</button>
			</div>
		</div>
		<p class="m-0 text-[11px] text-secondary">{{ formatMessage(messages.hint) }}</p>
	</div>
</template>
