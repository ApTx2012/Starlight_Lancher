<script setup lang="ts">
import { NewButton as Button, useVIntl } from '@modrinth/ui'
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'

import type { Puzzle } from './engine'
import { messages } from './messages'

const props = defineProps<{
	puzzle: Puzzle
	revealed: boolean[]
	selected: number
	playing: boolean
	lost: boolean
	mistake: number
	zoom: number
}>()
const emit = defineEmits<{
	paint: [index: number]
	'update:zoom': [value: number]
}>()
const { formatMessage } = useVIntl()
const viewport = ref<HTMLElement>()
const grid = ref<HTMLElement>()
const view = ref({ left: 0, top: 0, width: 0, height: 0 })
const brushCursor = ref<string>()
const brushActive = computed(() => props.playing && props.selected >= 0)
const large = computed(() => props.puzzle.difficulty !== 'easy')
const visibleCells = computed(() =>
	props.puzzle.answer.flatMap((color, i) =>
		props.revealed[i] || props.lost ? [{ color, i }] : [],
	),
)
const letter = (color: number) => String.fromCharCode(65 + color)

function updateView() {
	const el = viewport.value
	if (!el) return
	const size = props.puzzle.size
	view.value = {
		left: (el.scrollLeft / el.scrollWidth) * size,
		top: (el.scrollTop / el.scrollHeight) * size,
		width: Math.min(size, (el.clientWidth / el.scrollWidth) * size),
		height: Math.min(size, (el.clientHeight / el.scrollHeight) * size),
	}
}

async function setView(left: number, top: number) {
	await nextTick()
	viewport.value?.scrollTo(left, top)
	updateView()
}

async function centerFirstClue() {
	await nextTick()
	const el = viewport.value
	if (!el || !large.value) return setView(0, 0)
	const i = props.revealed.findIndex(Boolean)
	await setView(
		((i % props.puzzle.size) + 0.5) * (40 * props.zoom + 3) - el.clientWidth / 2,
		(Math.floor(i / props.puzzle.size) + 0.5) * (40 * props.zoom + 3) - el.clientHeight / 2,
	)
}

function navigate(event: MouseEvent) {
	const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
	const el = viewport.value
	if (!el) return
	void setView(
		((event.clientX - rect.left) / rect.width) * el.scrollWidth - el.clientWidth / 2,
		((event.clientY - rect.top) / rect.height) * el.scrollHeight - el.clientHeight / 2,
	)
}

async function changeZoom(value: number) {
	const el = viewport.value
	if (!el) return
	const zoom = Math.max(0.7, Math.min(1.6, Math.round(value * 10) / 10))
	const ratio = (40 * zoom + 3) / (40 * props.zoom + 3)
	const x = (el.scrollLeft + el.clientWidth / 2) * ratio - el.clientWidth / 2
	const y = (el.scrollTop + el.clientHeight / 2) * ratio - el.clientHeight / 2
	emit('update:zoom', zoom)
	await setView(x, y)
}

function onWheel(event: WheelEvent) {
	if (!large.value || !event.ctrlKey) return
	event.preventDefault()
	void changeZoom(props.zoom + (event.deltaY < 0 ? 0.1 : -0.1))
}

let cursorColor = ''
function updateBrushCursor() {
	if (!brushActive.value || !grid.value) return
	const color = getComputedStyle(grid.value).color
	if (color === cursorColor) return
	cursorColor = color
	// Let the native cursor follow the pointer independently of Vue and board rendering.
	// The hotspot is the same brush tip as the previous 32px floating SVG.
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 1024 1024"><path fill="${color}" d="M358.681 586.386s-90.968 49.4-94.488 126.827c-3.519 77.428-77.427 133.74-102.063 140.778s360.157 22.971 332.002-142.444l-135.45-125.16zm169.099 52.56c14.016 13.601 17.565 32.675 7.929 42.606-9.635 9.93-28.81 6.954-42.823-6.647l-92.767-88.518c-14.015-13.6-17.565-32.675-7.929-42.605 9.636-9.93 28.81-6.955 42.824 6.646l92.766 88.518zm321.734-465.083c-25.144-17.055-47.741-1.763-57.477 3.805-29.097 19.485-237.243 221.77-327.69 315.194-11.105 14.8-18.59 26.294 34.663 79.546 44.95 44.95 65.896 42.012 88.66 22.603 37.906-37.906 199.299-262.926 258.92-348.713 9.792-14.092 29.851-54.17 2.924-72.435z"/></svg>`
	brushCursor.value = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 5 27, crosshair`
}

watch(() => [props.playing, props.selected], updateBrushCursor, {
	flush: 'post',
})

function label(index: number) {
	const values = {
		row: Math.floor(index / props.puzzle.size) + 1,
		column: (index % props.puzzle.size) + 1,
	}
	return props.revealed[index] || props.lost
		? formatMessage(messages.revealed, {
				...values,
				color: letter(props.puzzle.answer[index]),
				number: props.puzzle.numbers[index],
			})
		: formatMessage(messages.hidden, values)
}

let observer: ResizeObserver | undefined
onMounted(() => {
	updateBrushCursor()
	observer = new ResizeObserver(updateView)
	if (viewport.value) observer.observe(viewport.value)
})
onScopeDispose(() => observer?.disconnect())
defineExpose({
	centerFirstClue,
	setView,
	getView: () => ({
		left: viewport.value?.scrollLeft ?? 0,
		top: viewport.value?.scrollTop ?? 0,
	}),
})
</script>

<template>
	<div class="mine-navigation" :class="{ 'mine-large': large }">
		<div ref="viewport" class="mine-viewport" @scroll.passive="updateView" @wheel="onWheel">
			<div
				ref="grid"
				class="mine-grid"
				:class="{
					'mine-grid-small': !large,
					'mine-grid-brush-active': brushActive,
				}"
				:style="{
					'--mine-size': puzzle.size,
					'--mine-cell-size': `${40 * zoom}px`,
					'--mine-brush-cursor': brushCursor,
					color: selected >= 0 ? `var(--mine-color-${selected})` : undefined,
				}"
				:aria-label="formatMessage(messages.board, { size: puzzle.size })"
				@pointerenter="updateBrushCursor"
			>
				<button
					v-for="(_, i) in puzzle.answer"
					:key="i"
					type="button"
					class="mine-cell"
					:class="{
						'mine-open': revealed[i] || lost,
						'mine-answer': lost && !revealed[i],
						'mine-mistake': mistake === i,
						'mine-sampled': revealed[i] && selected === puzzle.answer[i],
					}"
					:style="
						revealed[i] || lost
							? { '--mine-cell-color': `var(--mine-color-${puzzle.answer[i]})` }
							: undefined
					"
					:disabled="!playing"
					:aria-label="label(i)"
					@click="emit('paint', i)"
				>
					<template v-if="revealed[i] || lost">
						<span>{{ puzzle.numbers[i] }}</span
						><small>{{ letter(puzzle.answer[i]) }}</small>
					</template>
				</button>
			</div>
		</div>
		<div v-if="large" class="mine-overview">
			<svg
				class="mine-map"
				:viewBox="`0 0 ${puzzle.size} ${puzzle.size}`"
				role="img"
				:aria-label="formatMessage(messages.map)"
				@click="navigate"
			>
				<rect width="100%" height="100%" fill="var(--surface-1)" />
				<rect
					v-for="cell in visibleCells"
					:key="cell.i"
					:x="cell.i % puzzle.size"
					:y="Math.floor(cell.i / puzzle.size)"
					width="1"
					height="1"
					:fill="`var(--mine-color-${cell.color})`"
				/>
				<rect
					:x="view.left"
					:y="view.top"
					:width="view.width"
					:height="view.height"
					fill="none"
					stroke="var(--color-contrast)"
					stroke-width="2"
					vector-effect="non-scaling-stroke"
				/>
			</svg>
			<div class="mine-zoom">
				<Button
					size="sm"
					:disabled="zoom <= 0.7"
					:aria-label="formatMessage(messages.zoomOut)"
					@click="changeZoom(zoom - 0.1)"
					>−</Button
				>
				<span>{{ Math.round(zoom * 100) }}%</span>
				<Button
					size="sm"
					:disabled="zoom >= 1.6"
					:aria-label="formatMessage(messages.zoomIn)"
					@click="changeZoom(zoom + 0.1)"
					>+</Button
				>
			</div>
		</div>
	</div>
</template>

<style scoped>
.mine-navigation {
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	display: grid;
	gap: var(--gap-md);
}
.mine-large {
	grid-template-columns: minmax(0, 1fr) 7rem;
}
.mine-viewport {
	box-sizing: border-box;
	width: 100%;
	max-width: 100%;
	overflow: auto;
	max-height: min(52vh, 32rem);
	min-width: 0;
	background: var(--surface-1);
	border-radius: var(--radius-sm);
	overscroll-behavior: contain;
}
.mine-grid {
	display: grid;
	grid-template-columns: repeat(var(--mine-size), var(--mine-cell-size));
	/* Scrolling and minimap coordinates use a fixed square pitch at every zoom level. */
	grid-auto-rows: var(--mine-cell-size);
	gap: 3px;
	width: max-content;
	padding: 3px;
}
.mine-grid-small {
	grid-template-columns: repeat(var(--mine-size), minmax(0, 1fr));
	grid-auto-rows: auto;
	width: min(100%, 26rem, 48vh);
	margin: auto;
	box-sizing: border-box;
}
.mine-cell {
	position: relative;
	display: grid;
	place-items: center;
	width: 100%;
	aspect-ratio: 1;
	padding: 0;
	border: 1px solid color-mix(in srgb, var(--mine-ink) 38%, var(--surface-5));
	border-radius: var(--radius-sm);
	background: var(--surface-4);
	color: var(--color-contrast);
	font: inherit;
	font-weight: 700;
	cursor: pointer;
	user-select: none;
	touch-action: manipulation;
}
.mine-grid-brush-active,
.mine-grid-brush-active .mine-cell:not(.mine-open):not(:disabled) {
	cursor: var(--mine-brush-cursor, crosshair);
}
.mine-cell:hover:not(:disabled) {
	background: var(--surface-5);
	border-color: var(--mine-ink);
}
.mine-cell:focus-visible {
	outline: 2px solid var(--color-contrast);
	outline-offset: -3px;
	z-index: 1;
}
.mine-open {
	background: color-mix(in srgb, var(--mine-cell-color) 34%, var(--surface-2));
	border-color: var(--mine-cell-color);
	cursor: pointer;
}
.mine-open:hover:not(:disabled) {
	background: color-mix(in srgb, var(--mine-cell-color) 50%, var(--surface-2));
}
.mine-sampled {
	box-shadow: inset 0 0 0 1px var(--mine-cell-color);
}
.mine-cell small {
	position: absolute;
	right: 3px;
	bottom: 1px;
	font-size: 0.5rem;
	line-height: 1;
}
.mine-answer {
	opacity: 0.55;
}
.mine-cell:disabled {
	cursor: default;
}
.mine-mistake {
	opacity: 1;
	outline: 3px solid var(--color-red);
	outline-offset: -3px;
}
.mine-overview {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	align-items: center;
}
.mine-map {
	display: block;
	width: 7rem;
	height: auto;
	aspect-ratio: 1;
	border: 1px solid var(--surface-5);
	border-radius: var(--radius-sm);
	cursor: crosshair;
}
.mine-zoom {
	display: flex;
	align-items: center;
	gap: var(--gap-xs);
	font-size: 0.75rem;
	font-variant-numeric: tabular-nums;
}
@media (max-width: 600px) {
	.mine-large {
		grid-template-columns: minmax(0, 1fr);
	}
	.mine-overview {
		flex-direction: row;
		justify-content: space-between;
	}
	.mine-map {
		width: 4.5rem;
	}
}
</style>
