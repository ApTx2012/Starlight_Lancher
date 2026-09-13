import assert from 'node:assert/strict'
import test from 'node:test'

import { generate } from './engine.ts'
import {
	parseSave,
	readBest,
	recordBest,
	SAVE_KEY,
	type SavedGame,
	saveGame,
	validateResume,
} from './storage.ts'

const puzzle = generate(123, 'easy')
const saved: SavedGame = {
	version: 1,
	seed: puzzle.seed,
	difficulty: puzzle.difficulty,
	revealed: puzzle.clues.slice(),
	selected: -1,
	elapsed: 4321,
	zoom: 1,
	left: 12,
	top: 34,
}
function memoryStorage() {
	const values = new Map<string, string>()
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value)
		},
		removeItem: (key: string) => {
			values.delete(key)
		},
	}
}

test('save round trip keeps board progress, brush, timer and viewport', () => {
	const storage = memoryStorage()
	saveGame(storage, saved)
	assert.deepEqual(parseSave(storage.getItem(SAVE_KEY)), saved)
	validateResume(saved, puzzle)
	assert.equal(parseSave(null), null)
})

test('malformed and incompatible saves are rejected without overwriting data', () => {
	for (const bad of [
		null,
		{},
		{ ...saved, version: 2 },
		{ ...saved, difficulty: '__proto__' },
		{ ...saved, revealed: [true] },
		{ ...saved, elapsed: -1 },
		{ ...saved, selected: 15 },
		{ ...saved, zoom: 5 },
		{ ...saved, seed: 1.2 },
		{ ...saved, top: -1 },
		{ ...saved, revealed: saved.revealed.map(() => true) },
	]) {
		assert.throws(() => parseSave(JSON.stringify(bad)))
	}
	assert.throws(() => parseSave('{invalid'))
	assert.throws(() => validateResume({ ...saved, seed: 9 }, puzzle))
	assert.throws(() =>
		validateResume({ ...saved, revealed: saved.revealed.map(() => false) }, puzzle),
	)
	const storage = memoryStorage()
	saveGame(storage, saved)
	assert.throws(() => saveGame(storage, { ...saved, elapsed: -1 }))
	assert.deepEqual(parseSave(storage.getItem(SAVE_KEY)), saved)
})

test('storage failures are surfaced so the UI can keep the active board', () => {
	assert.throws(() =>
		saveGame(
			{
				...memoryStorage(),
				setItem: () => {
					throw new Error('Quota exceeded')
				},
			},
			saved,
		),
	)
})

test('best times are independent per difficulty and only improve', () => {
	const storage = memoryStorage()
	assert.equal(readBest(storage, 'easy'), null)
	assert.equal(recordBest(storage, 'easy', 1000), 1000)
	assert.equal(recordBest(storage, 'easy', 2000), 1000)
	assert.equal(recordBest(storage, 'easy', 500), 500)
	assert.equal(recordBest(storage, 'hard', 9000), 9000)
	assert.equal(readBest(storage, 'easy'), 500)
	assert.throws(() => recordBest(storage, 'easy', -1))
})
