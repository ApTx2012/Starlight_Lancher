<script setup lang="ts">
import {
	defineMessages,
	injectNotificationManager,
	NewModal,
	StyledInput,
	useVIntl,
} from '@modrinth/ui'
import { computed, ref } from 'vue'

import { type SkinSiteBugIssueType, skinSiteCreateBugIssue } from '@/helpers/skin-site-api'

const emit = defineEmits<{ (e: 'created', id: number): void }>()

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()

const messages = defineMessages({
	title: { id: 'app.skin-site.bug-create.title', defaultMessage: 'New issue' },
	type: { id: 'app.skin-site.bug-create.type', defaultMessage: 'Type' },
	titleField: { id: 'app.skin-site.bug-create.title-field', defaultMessage: 'Title' },
	titlePlaceholder: {
		id: 'app.skin-site.bug-create.title-placeholder',
		defaultMessage: 'A short summary of the problem',
	},
	description: { id: 'app.skin-site.bug-create.description', defaultMessage: 'Description' },
	descriptionPlaceholder: {
		id: 'app.skin-site.bug-create.description-placeholder',
		defaultMessage: 'What happened, and how can it be reproduced?',
	},
	privateLabel: { id: 'app.skin-site.bug-create.private', defaultMessage: 'Private issue' },
	privateHint: {
		id: 'app.skin-site.bug-create.private-hint',
		defaultMessage: 'Only you and the maintainers can see it.',
	},
	images: { id: 'app.skin-site.bug-create.images', defaultMessage: 'Images' },
	imagesHint: {
		id: 'app.skin-site.bug-create.images-hint',
		defaultMessage: 'Optional, up to 5 images.',
	},
	submit: { id: 'app.skin-site.bug-create.submit', defaultMessage: 'Create issue' },
	submitting: { id: 'app.skin-site.bug-create.submitting', defaultMessage: 'Creating…' },
	created: { id: 'app.skin-site.bug-create.created', defaultMessage: 'Issue created.' },
	cancel: { id: 'app.skin-site.bug-create.cancel', defaultMessage: 'Cancel' },
	typeBug: { id: 'app.skin-site.bugs.type.bug', defaultMessage: 'Bug' },
	typeFeature: { id: 'app.skin-site.bugs.type.feature', defaultMessage: 'Feature' },
	typeImprovement: { id: 'app.skin-site.bugs.type.improvement', defaultMessage: 'Improvement' },
})

const modal = ref<InstanceType<typeof NewModal>>()
const type = ref<SkinSiteBugIssueType>('BUG')
const title = ref('')
const description = ref('')
const isPrivate = ref(false)
const images = ref<File[]>([])
const working = ref(false)

const TYPE_OPTIONS: SkinSiteBugIssueType[] = ['BUG', 'FEATURE', 'IMPROVEMENT']

function typeLabel(t: SkinSiteBugIssueType): string {
	if (t === 'FEATURE') return formatMessage(messages.typeFeature)
	if (t === 'IMPROVEMENT') return formatMessage(messages.typeImprovement)
	return formatMessage(messages.typeBug)
}

const canSubmit = computed(
	() => title.value.trim().length > 0 && description.value.trim().length > 0 && !working.value,
)

function reset() {
	type.value = 'BUG'
	title.value = ''
	description.value = ''
	isPrivate.value = false
	images.value = []
	working.value = false
}

function show() {
	reset()
	modal.value?.show()
}

function onFiles(event: Event) {
	const input = event.target as HTMLInputElement
	images.value = Array.from(input.files ?? []).slice(0, 5)
}

async function submit() {
	if (!canSubmit.value) return
	working.value = true
	try {
		const result = await skinSiteCreateBugIssue(
			{
				type: type.value,
				title: title.value.trim(),
				description: description.value.trim(),
				private: isPrivate.value,
			},
			images.value,
		)
		if (!result.success) throw new Error(result.errorMessage)
		addNotification({ type: 'success', title: formatMessage(messages.created) })
		modal.value?.hide()
		emit('created', result.payload.id)
	} catch (error) {
		handleError(error)
	} finally {
		working.value = false
	}
}

function cancel() {
	modal.value?.hide()
	reset()
}

defineExpose({ show })
</script>
<template>
	<NewModal ref="modal" :header="formatMessage(messages.title)" @hide="reset">
		<div class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.type) }}</span>
				<select
					v-model="type"
					class="rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast"
				>
					<option v-for="t in TYPE_OPTIONS" :key="t" :value="t">{{ typeLabel(t) }}</option>
				</select>
			</label>

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.titleField) }}</span>
				<StyledInput
					v-model="title"
					type="text"
					:placeholder="formatMessage(messages.titlePlaceholder)"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.description) }}</span>
				<textarea
					v-model="description"
					rows="5"
					class="w-full resize-y rounded-lg border border-solid border-surface-5 bg-bg-raised px-3 py-2 text-sm text-contrast outline-none focus:border-brand"
					:placeholder="formatMessage(messages.descriptionPlaceholder)"
				/>
			</label>

			<label class="flex items-start gap-2">
				<input v-model="isPrivate" type="checkbox" class="mt-1" />
				<span class="flex flex-col">
					<span class="text-sm font-semibold text-contrast">
						{{ formatMessage(messages.privateLabel) }}
					</span>
					<span class="text-xs text-secondary">{{ formatMessage(messages.privateHint) }}</span>
				</span>
			</label>

			<label class="flex flex-col gap-1">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.images) }}</span>
				<input type="file" accept="image/*" multiple @change="onFiles" />
				<span class="text-xs text-secondary">{{ formatMessage(messages.imagesHint) }}</span>
			</label>

			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-full bg-button-bg px-4 py-2 text-sm font-semibold text-contrast hover:brightness-110"
					@click="cancel"
				>
					{{ formatMessage(messages.cancel) }}
				</button>
				<button
					type="button"
					class="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-contrast disabled:opacity-50"
					:disabled="!canSubmit"
					@click="submit"
				>
					{{ working ? formatMessage(messages.submitting) : formatMessage(messages.submit) }}
				</button>
			</div>
		</div>
	</NewModal>
</template>
