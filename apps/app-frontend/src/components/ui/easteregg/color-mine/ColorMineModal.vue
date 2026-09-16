<script setup lang="ts">
import './palette.css'

import { NewButton as Button, NewModal, useVIntl } from '@modrinth/ui'
import { computed, nextTick, onScopeDispose, ref, shallowRef } from 'vue'

import ColorMineBoard from './ColorMineBoard.vue'
import { type Difficulty, LEVELS, type Puzzle } from './engine'
import { messages } from './messages'
import {
	parseSave,
	readBest,
	recordBest,
	SAVE_KEY,
	type SavedGame,
	saveGame,
	validateResume,
} from './storage'

const { formatMessage } = useVIntl()
const modal = ref<InstanceType<typeof NewModal>>()
const board = ref<InstanceType<typeof ColorMineBoard>>()
const prompt = ref<HTMLElement>()
const puzzle = shallowRef<Puzzle>()
const revealed = ref<boolean[]>([])
const selected = ref(-1)
const mistake = ref(-1)
const elapsed = ref(0)
const zoom = ref(1)
const best = ref<number | null>(null)
const difficulty = ref<Difficulty>('easy')
const levels = Object.keys(LEVELS) as Difficulty[]
const screen = ref<'loading' | 'board' | 'saved' | 'error'>('loading')
const result = ref<'playing' | 'lost' | 'won'>('playing')
const confirmation = ref<'leave' | 'replace' | null>(null)
const saved = shallowRef<SavedGame | null>(null)
const storageError = ref(false)
const recordError = ref(false)
const needsColor = ref(false)
let nextDifficulty: Difficulty = 'easy'
let worker: Worker | undefined
let active = false
let closing = false
let started = false
let heldView = { left: 0, top: 0 }
let lastTick = performance.now()
const count = computed(() => revealed.value.filter(Boolean).length)
const letter = (color: number) => String.fromCharCode(65 + color)
const timeText = (time: number) => {
	const seconds = Math.floor(time / 1000)
	return `${Math.floor(seconds / 60)
		.toString()
		.padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
const status = computed(() => {
	if (result.value === 'won') return formatMessage(messages.won)
	if (result.value === 'lost' && puzzle.value)
		return formatMessage(messages.lost, {
			row: Math.floor(mistake.value / puzzle.value.size) + 1,
			column: (mistake.value % puzzle.value.size) + 1,
			selected: letter(selected.value),
			correct: letter(puzzle.value.answer[mistake.value]),
		})
	return selected.value < 0 || needsColor.value
		? formatMessage(messages.choose)
		: formatMessage(messages.selected, { color: letter(selected.value) })
})

function tick() {
	const now = performance.now()
	if (
		active &&
		started &&
		screen.value === 'board' &&
		result.value === 'playing' &&
		!confirmation.value &&
		!document.hidden
	) {
		elapsed.value += now - lastTick
	}
	lastTick = now
}
let timer: number | undefined
function visibilityChanged() {
	lastTick = performance.now()
}
document.addEventListener('visibilitychange', visibilityChanged)

async function show() {
	if (active || closing) return
	active = true
	lastTick = performance.now()
	timer = window.setInterval(tick, 250)
	modal.value?.show()
	loadSaved()
}

function loadSaved() {
	storageError.value = false
	saved.value = null
	try {
		saved.value = parseSave(localStorage.getItem(SAVE_KEY))
		if (saved.value) {
			difficulty.value = saved.value.difficulty
			screen.value = 'saved'
		} else start(difficulty.value)
	} catch {
		screen.value = 'saved'
		storageError.value = true
	}
}

function start(level: Difficulty, resume?: SavedGame) {
	worker?.terminate()
	confirmation.value = null
	storageError.value = false
	recordError.value = false
	screen.value = 'loading'
	difficulty.value = level
	started = false
	try {
		const pending = new Worker(new URL('./generator.worker.ts', import.meta.url), {
			type: 'module',
		})
		worker = pending
		pending.onerror = () => {
			if (worker !== pending) return
			pending.terminate()
			worker = undefined
			screen.value = 'error'
		}
		pending.onmessage = async (event: MessageEvent<{ puzzle?: Puzzle; error?: boolean }>) => {
			if (worker !== pending || !active) return
			pending.terminate()
			worker = undefined
			if (!event.data.puzzle) {
				screen.value = 'error'
				return
			}
			const generated = event.data.puzzle
			if (resume) {
				try {
					validateResume(resume, generated)
					// Consume the save before playing so losing cannot reload an older, safe state.
					localStorage.removeItem(SAVE_KEY)
				} catch {
					screen.value = 'saved'
					storageError.value = true
					return
				}
			}
			saved.value = null
			puzzle.value = generated
			revealed.value = resume?.revealed.slice() ?? generated.clues.slice()
			selected.value = resume?.selected ?? -1
			elapsed.value = resume?.elapsed ?? 0
			started = elapsed.value > 0
			lastTick = performance.now()
			zoom.value = resume?.zoom ?? 1
			mistake.value = -1
			needsColor.value = false
			result.value = 'playing'
			screen.value = 'board'
			try {
				best.value = readBest(localStorage, level)
			} catch {
				best.value = null
			}
			await nextTick()
			if (resume) await board.value?.setView(resume.left, resume.top)
			else await board.value?.centerFirstClue()
		}
		pending.postMessage({
			seed: resume?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0],
			difficulty: level,
		})
	} catch {
		worker?.terminate()
		worker = undefined
		screen.value = 'error'
	}
}

function paint(index: number) {
	const current = puzzle.value
	if (!current || confirmation.value || result.value !== 'playing') return
	if (revealed.value[index]) {
		selected.value = current.answer[index]
		needsColor.value = false
		return
	}
	if (selected.value < 0) {
		needsColor.value = true
		return
	}
	tick()
	started = true
	if (selected.value !== current.answer[index]) {
		mistake.value = index
		result.value = 'lost'
		return
	}
	revealed.value[index] = true
	if (revealed.value.every(Boolean)) {
		result.value = 'won'
		try {
			best.value = recordBest(localStorage, current.difficulty, elapsed.value)
		} catch {
			recordError.value = true
		}
	}
}

async function ask(kind: 'leave' | 'replace') {
	tick()
	heldView = board.value?.getView() ?? { left: 0, top: 0 }
	confirmation.value = kind
	await nextTick()
	prompt.value?.focus()
}

function requestNew(level: Difficulty = difficulty.value) {
	nextDifficulty = level
	if (screen.value === 'board' && result.value === 'playing') void ask('replace')
	else start(level)
}

function requestClose() {
	if (confirmation.value) {
		confirmation.value = null
		lastTick = performance.now()
		void nextTick(() => board.value?.setView(heldView.left, heldView.top))
		return
	}
	if (screen.value === 'board' && result.value === 'playing') void ask('leave')
	else void close()
}

async function close() {
	if (closing) return
	closing = true
	active = false
	window.clearInterval(timer)
	timer = undefined
	worker?.terminate()
	worker = undefined
	await modal.value?.hide()
	confirmation.value = null
	puzzle.value = undefined
	closing = false
}

async function saveAndLeave() {
	if (!puzzle.value) return
	try {
		saveGame(localStorage, {
			version: 1,
			seed: puzzle.value.seed,
			difficulty: puzzle.value.difficulty,
			revealed: revealed.value.slice(),
			selected: selected.value,
			elapsed: elapsed.value,
			zoom: zoom.value,
			left: heldView.left,
			top: heldView.top,
		})
		await close()
	} catch {
		storageError.value = true
	}
}

function discardSaved() {
	try {
		localStorage.removeItem(SAVE_KEY)
		saved.value = null
		start(difficulty.value)
	} catch {
		storageError.value = true
	}
}

function keydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault()
		requestClose()
	}
}

onScopeDispose(() => {
	worker?.terminate()
	window.clearInterval(timer)
	document.removeEventListener('visibilitychange', visibilityChanged)
})
defineExpose({ show })
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.title)"
		width="56rem"
		max-width="56rem"
		scrollable
		:closable="false"
		:close-on-esc="false"
		actions-divider
		@keydown.stop="keydown"
	>
		<div
			class="color-mine"
			:style="{
				'--mine-ink': selected >= 0 ? `var(--mine-color-${selected})` : 'var(--color-brand)',
			}"
		>
			<div v-if="confirmation" ref="prompt" class="mine-prompt" tabindex="-1" role="alert">
				<h3>
					{{
						formatMessage(confirmation === 'leave' ? messages.leaveTitle : messages.replaceTitle)
					}}
				</h3>
				<p>
					{{ formatMessage(confirmation === 'leave' ? messages.leaveText : messages.replaceText) }}
				</p>
			</div>
			<div v-if="screen === 'board' && puzzle" v-show="!confirmation" class="mine-play">
				<div class="mine-toolbar">
					<div class="mine-levels">
						<Button
							v-for="level in levels"
							:key="level"
							size="sm"
							:type="difficulty === level ? 'outlined' : 'base'"
							:aria-pressed="difficulty === level"
							@click="level !== difficulty && requestNew(level)"
							>{{ formatMessage(messages[level]) }}</Button
						>
					</div>
					<span class="mine-time">{{ timeText(elapsed) }}</span>
				</div>
				<div class="mine-frame">
					<p class="mine-status" role="status">{{ status }}</p>
					<ColorMineBoard
						ref="board"
						v-model:zoom="zoom"
						:puzzle="puzzle"
						:revealed="revealed"
						:selected="selected"
						:playing="result === 'playing'"
						:lost="result === 'lost'"
						:mistake="mistake"
						@paint="paint"
					/>
				</div>
				<div class="mine-stats">
					<span>{{ formatMessage(messages.progress, { count, total: revealed.length }) }}</span>
					<span v-if="best !== null">{{
						formatMessage(messages.best, { time: timeText(best) })
					}}</span>
				</div>
				<p v-if="result === 'lost'" class="mine-meta">{{ formatMessage(messages.review) }}</p>
				<p v-if="recordError" role="alert">{{ formatMessage(messages.recordError) }}</p>
				<details class="mine-rules">
					<summary>{{ formatMessage(messages.rulesTitle) }}</summary>
					<p>{{ formatMessage(messages.rules) }}</p>
				</details>
			</div>
			<p v-else-if="screen === 'loading'" role="status">{{ formatMessage(messages.loading) }}</p>
			<div v-else-if="screen === 'saved'" class="mine-prompt">
				<h3>{{ formatMessage(messages.savedTitle) }}</h3>
				<p v-if="saved">
					{{ formatMessage(messages[saved.difficulty]) }} · {{ timeText(saved.elapsed) }}
				</p>
			</div>
			<p v-else role="alert">{{ formatMessage(messages.generateError) }}</p>
			<p v-if="storageError" role="alert">{{ formatMessage(messages.storageError) }}</p>
		</div>
		<template #actions>
			<div class="mine-actions">
				<template v-if="confirmation">
					<Button @click="requestClose">{{ formatMessage(messages.continue) }}</Button>
					<Button v-if="confirmation === 'leave'" @click="close">{{
						formatMessage(messages.discard)
					}}</Button>
					<Button
						type="colored"
						color="brand"
						@click="confirmation === 'leave' ? saveAndLeave() : start(nextDifficulty)"
					>
						{{
							formatMessage(confirmation === 'leave' ? messages.saveLeave : messages.newGame)
						}}</Button
					>
				</template>
				<template v-else>
					<Button @click="requestClose">{{ formatMessage(messages.close) }}</Button>
					<template v-if="screen === 'saved'">
						<Button @click="discardSaved">{{ formatMessage(messages.discard) }}</Button>
						<Button
							type="colored"
							color="brand"
							@click="saved ? start(saved.difficulty, saved) : loadSaved()"
						>
							{{ formatMessage(saved ? messages.resume : messages.retry) }}</Button
						>
					</template>
					<Button
						v-else-if="screen !== 'loading'"
						:type="result === 'playing' && screen === 'board' ? 'base' : 'colored'"
						color="brand"
						@click="screen === 'error' && saved ? start(saved.difficulty, saved) : requestNew()"
					>
						{{ formatMessage(screen === 'error' ? messages.retry : messages.newGame) }}</Button
					>
				</template>
			</div>
		</template>
	</NewModal>
</template>

<style scoped>
.color-mine {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	min-width: 0;
}
.mine-play {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	min-width: 0;
}
.mine-toolbar,
.mine-levels,
.mine-stats,
.mine-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--gap-sm);
}
.mine-time {
	margin-left: auto;
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	color: var(--color-contrast);
}
.mine-meta,
.mine-stats,
.mine-rules {
	color: var(--color-secondary);
	font-size: 0.875rem;
}
.mine-stats {
	justify-content: space-between;
}
.mine-frame {
	box-sizing: border-box;
	min-width: 0;
	max-width: 100%;
	border: 2px solid var(--mine-ink);
	border-radius: var(--radius-md);
	padding: var(--gap-md);
	background: var(--surface-2);
}
.mine-status {
	min-width: 0;
	max-width: 100%;
	margin: 0 0 var(--gap-md);
	color: var(--color-contrast);
	font-size: 0.875rem;
	overflow-wrap: anywhere;
}
.mine-actions {
	justify-content: flex-end;
}
.mine-prompt h3,
.mine-prompt p {
	margin: 0 0 var(--gap-md);
}
.mine-rules summary {
	cursor: pointer;
}
.mine-rules p {
	line-height: 1.6;
	margin-bottom: 0;
}
</style>
