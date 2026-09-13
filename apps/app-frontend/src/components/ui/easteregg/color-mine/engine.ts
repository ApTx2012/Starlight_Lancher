export const LEVELS = {
	easy: { size: 10, colors: 4, density: 0.35 },
	normal: { size: 25, colors: 6, density: 0.15 },
	hard: { size: 60, colors: 10, density: 0 },
} as const
export type Difficulty = keyof typeof LEVELS
export interface Board {
	size: number
	colors: number
	answer: number[]
	numbers: number[]
}
export interface Puzzle extends Board {
	clues: boolean[]
	seed: number
	difficulty: Difficulty
}

const singleton = (mask: number) => mask > 0 && (mask & (mask - 1)) === 0
export const colorOf = (mask: number) => 31 - Math.clz32(mask)

function randomSource(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function shuffle<T>(items: T[], random: () => number) {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1))
		;[items[i], items[j]] = [items[j], items[i]]
	}
	return items
}

export function createEngine(size: number, colors: number) {
	const count = size * size
	const all = (1 << colors) - 1
	const indices = Array.from({ length: count }, (_, i) => i)
	const around = indices.map((i) => {
		const neighbors: number[] = []
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const x = (i % size) + dx
				const y = Math.floor(i / size) + dy
				if ((dx || dy) && x >= 0 && x < size && y >= 0 && y < size) {
					neighbors.push(y * size + x)
				}
			}
		}
		return neighbors
	})
	const distance = (a: number, b: number) =>
		Math.abs((a % size) - (b % size)) + Math.abs(Math.floor(a / size) - Math.floor(b / size))
	const cross = around.map((neighbors, i) => neighbors.filter((j) => distance(i, j) === 1))

	function grow(random: () => number): Board {
		const answer: number[] = Array(count).fill(-1)
		const areas: number[] = Array(colors).fill(0)
		const seeds: number[] = []
		for (let color = 0; color < colors; color++) {
			const candidates = shuffle(
				indices.filter((i) => answer[i] < 0),
				random,
			).slice(0, 80)
			if (color) {
				candidates.sort(
					(a, b) =>
						Math.min(...seeds.map((s) => distance(b, s))) -
						Math.min(...seeds.map((s) => distance(a, s))),
				)
			}
			const seed = candidates[0]
			answer[seed] = color
			areas[color]++
			seeds.push(seed)
		}
		const frontier: number[][] = Array.from({ length: colors }, () => [])
		const queued = Array.from({ length: colors }, () => new Uint8Array(count))
		function extend(i: number, color: number) {
			for (const j of cross[i]) {
				if (answer[j] < 0 && !queued[color][j]) {
					frontier[color].push(j)
					queued[color][j] = 1
				}
			}
		}
		seeds.forEach(extend)
		let left = count - colors
		while (left) {
			const available = areas.map((_, c) => c).filter((c) => frontier[c].length)
			available.sort((a, b) => areas[a] - areas[b])
			if (!available.length) throw new Error('Incomplete region growth')
			const color = available[Math.floor(random() * Math.min(2, available.length))]
			const list = frontier[color]
			const position = Math.floor(random() * list.length)
			const i = list[position]
			list[position] = list[list.length - 1]
			list.pop()
			if (answer[i] >= 0) continue
			answer[i] = color
			areas[color]++
			left--
			extend(i, color)
		}
		return {
			size,
			colors,
			answer,
			numbers: answer.map((color, i) => around[i].filter((j) => answer[j] === color).length),
		}
	}

	// Only revealed cells supply numbers. Deduced cells become new clues after a safe paint.
	function propagate(board: Board, revealed: boolean[], masks: number[]) {
		let changed = true
		while (changed) {
			changed = false
			for (const i of indices) {
				if (!revealed[i]) continue
				const bit = 1 << board.answer[i]
				const target = board.numbers[i]
				let sure = 0
				const optional: number[] = []
				for (const j of around[i]) {
					if (masks[j] === bit) sure++
					else if (masks[j] & bit) optional.push(j)
				}
				if (sure > target || sure + optional.length < target) throw new Error('Contradictory clue')
				if (sure === target || sure + optional.length === target) {
					for (const j of optional) {
						masks[j] = sure === target ? masks[j] & ~bit : bit
						changed = true
					}
				}
			}
		}
	}

	function connectivity(masks: number[]) {
		let changed = false
		for (let color = 0; color < colors; color++) {
			const bit = 1 << color
			const source = masks.indexOf(bit)
			if (source < 0) continue
			// Iterative Tarjan traversal avoids a recursive stack overflow on the 60 × 60 board.
			const order = new Int32Array(count)
			const low = new Int32Array(count)
			const parent = new Int32Array(count).fill(-1)
			const terminals = new Int32Array(count)
			const edge = new Uint8Array(count)
			const stack = [source]
			let time = 1
			order[source] = low[source] = terminals[source] = 1
			while (stack.length) {
				const u = stack[stack.length - 1]
				if (edge[u] < cross[u].length) {
					const v = cross[u][edge[u]++]
					if (!(masks[v] & bit)) continue
					if (!order[v]) {
						parent[v] = u
						order[v] = low[v] = ++time
						terminals[v] = masks[v] === bit ? 1 : 0
						stack.push(v)
					} else if (v !== parent[u]) low[u] = Math.min(low[u], order[v])
				} else {
					stack.pop()
					const p = parent[u]
					if (p < 0) continue
					low[p] = Math.min(low[p], low[u])
					terminals[p] += terminals[u]
					// A bridge must be this color if its removal separates two known same-color cells.
					if (p !== source && low[u] >= order[p] && terminals[u] > 0 && masks[p] !== bit) {
						masks[p] = bit
						changed = true
					}
				}
			}
			for (const i of indices) {
				if (masks[i] & bit && !order[i]) {
					masks[i] &= ~bit
					changed = true
				}
			}
		}
		if (masks.some((mask) => mask === 0)) throw new Error('Empty color domain')
		return changed
	}

	function infer(board: Board, revealed: boolean[]) {
		const masks = board.answer.map((color, i) => (revealed[i] ? 1 << color : all))
		do {
			propagate(board, revealed, masks)
		} while (connectivity(masks))
		return masks
	}

	function solve(board: Board, clues: boolean[]) {
		const revealed = clues.slice()
		const masks = board.answer.map((color, i) => (revealed[i] ? 1 << color : all))
		while (true) {
			propagate(board, revealed, masks)
			const next = indices.filter((i) => !revealed[i] && singleton(masks[i]))
			if (!next.length) {
				if (!connectivity(masks)) return revealed
				continue
			}
			for (const i of next) {
				if (colorOf(masks[i]) !== board.answer[i]) throw new Error('Unsound deduction')
				revealed[i] = true
			}
		}
	}
	return { around, cross, grow, infer, solve }
}

export function generate(seed: number, difficulty: Difficulty): Puzzle {
	const level = LEVELS[difficulty]
	const random = randomSource(seed)
	const engine = createEngine(level.size, level.colors)
	const board = engine.grow(random)
	const indices = board.answer.map((_, i) => i)
	const clues: boolean[] = indices.map(() => false)
	for (let color = 0; color < level.colors; color++) {
		const cells = shuffle(
			indices.filter((i) => board.answer[i] === color),
			random,
		)
		cells.sort((a, b) => board.numbers[b] - board.numbers[a])
		clues[cells[0]] = true
	}
	let solved = engine.solve(board, clues)
	while (solved.some((value) => !value)) {
		const cells = shuffle(
			indices.filter((i) => !solved[i]),
			random,
		)
		cells.sort(
			(a, b) =>
				engine.around[b].filter((j) => !solved[j]).length -
				engine.around[a].filter((j) => !solved[j]).length,
		)
		clues[cells[0]] = true
		solved = engine.solve(board, clues)
	}
	// Greedy irredundancy under these deduction rules, not a claim of global minimum clue count.
	for (const i of shuffle(
		indices.filter((i) => clues[i]),
		random,
	)) {
		if (indices.filter((j) => clues[j] && board.answer[j] === board.answer[i]).length <= 1) continue
		clues[i] = false
		if (engine.solve(board, clues).some((value) => !value)) clues[i] = true
	}
	const target = Math.ceil(indices.length * level.density)
	const pools = Array.from({ length: level.colors }, (_, color) =>
		shuffle(
			indices.filter((i) => board.answer[i] === color && !clues[i]),
			random,
		),
	)
	let total = clues.filter(Boolean).length
	while (total < target) {
		for (const pool of pools) {
			if (pool.length && total < target) {
				clues[pool.pop()!] = true
				total++
			}
		}
	}
	return { ...board, clues, seed, difficulty }
}
