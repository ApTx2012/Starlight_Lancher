import assert from 'node:assert/strict'
import test from 'node:test'

import { type Board, createEngine, type Difficulty, generate, LEVELS } from './engine.ts'

function connected(board: Board) {
	const { cross } = createEngine(board.size, board.colors)
	for (let color = 0; color < board.colors; color++) {
		const source = board.answer.indexOf(color)
		if (source < 0) return false
		const visited = new Set([source])
		const pending = [source]
		while (pending.length) {
			for (const neighbor of cross[pending.pop()!]) {
				if (board.answer[neighbor] === color && !visited.has(neighbor)) {
					visited.add(neighbor)
					pending.push(neighbor)
				}
			}
		}
		if (visited.size !== board.answer.filter((c) => c === color).length) return false
	}
	return true
}

for (const difficulty of Object.keys(LEVELS) as Difficulty[]) {
	test(`${difficulty}: 20 seeds have connected colors, correct numbers and a complete no-guess path`, () => {
		for (let seed = 1; seed <= 20; seed++) {
			const puzzle = generate(seed, difficulty)
			const engine = createEngine(puzzle.size, puzzle.colors)
			assert.ok(connected(puzzle))
			assert.ok(puzzle.clues.some((v) => !v))
			assert.ok(
				puzzle.clues.filter(Boolean).length >=
					Math.ceil(puzzle.size ** 2 * LEVELS[difficulty].density),
			)
			for (let color = 0; color < puzzle.colors; color++) {
				assert.ok(puzzle.clues.some((v, i) => v && puzzle.answer[i] === color))
			}
			assert.deepEqual(
				puzzle.numbers,
				puzzle.answer.map(
					(color, i) => engine.around[i].filter((j) => puzzle.answer[j] === color).length,
				),
			)
			assert.ok(engine.solve(puzzle, puzzle.clues).every(Boolean))
			if (difficulty === 'hard') {
				for (let i = 0; i < puzzle.clues.length; i++) {
					if (
						!puzzle.clues[i] ||
						puzzle.clues.filter((v, j) => v && puzzle.answer[j] === puzzle.answer[i]).length <= 1
					)
						continue
					const fewer = puzzle.clues.slice()
					fewer[i] = false
					assert.ok(
						engine.solve(puzzle, fewer).some((v) => !v),
						`Redundant clue at ${i}, seed ${seed}`,
					)
				}
			}
		}
	})
}

test('seeded generation is deterministic for saved games', () => {
	assert.deepEqual(generate(4294967295, 'normal'), generate(4294967295, 'normal'))
})

test('deductions agree with exhaustive valid 3 × 3 boards; unrevealed numbers never leak', () => {
	const engine = createEngine(3, 2)
	const boards: Board[] = []
	for (let bits = 1; bits < 511; bits++) {
		const answer = Array.from({ length: 9 }, (_, i) => (bits >> i) & 1)
		const board = {
			size: 3,
			colors: 2,
			answer,
			numbers: answer.map((c, i) => engine.around[i].filter((j) => answer[j] === c).length),
		}
		if (connected(board)) boards.push(board)
	}
	for (const board of boards) {
		const revealed = board.answer.map((color, i) => i === board.answer.indexOf(color))
		const masks = engine.infer(board, revealed)
		const candidates = boards.filter((candidate) =>
			revealed.every(
				(open, i) =>
					!open ||
					(candidate.answer[i] === board.answer[i] && candidate.numbers[i] === board.numbers[i]),
			),
		)
		for (const candidate of candidates) {
			candidate.answer.forEach((color, i) => assert.ok(masks[i] & (1 << color)))
		}
		const hiddenScrambled = {
			...board,
			answer: board.answer.map((c, i) => (revealed[i] ? c : 1 - c)),
			numbers: board.numbers.map((n, i) => (revealed[i] ? n : 99)),
		}
		assert.deepEqual(engine.infer(hiddenScrambled, revealed), masks)
	}
})

test('diagonal contact does not connect a color', () => {
	assert.equal(
		connected({ size: 2, colors: 2, answer: [0, 1, 1, 0], numbers: [1, 1, 1, 1] }),
		false,
	)
})
