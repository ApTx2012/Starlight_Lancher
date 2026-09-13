import { type Difficulty, LEVELS, type Puzzle } from './engine.ts'

export const SAVE_KEY = 'starlight.color-mine.save.v1'
const BEST_KEY = 'starlight.color-mine.best.v1'
export interface SavedGame {
	version: 1
	seed: number
	difficulty: Difficulty
	revealed: boolean[]
	selected: number
	elapsed: number
	zoom: number
	left: number
	top: number
}
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const finite = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value)
export function parseSave(raw: string | null): SavedGame | null {
	if (raw === null) return null
	const value = JSON.parse(raw) as Partial<SavedGame> | null
	if (
		!value ||
		value.version !== 1 ||
		!value.difficulty ||
		!Object.keys(LEVELS).includes(value.difficulty)
	) {
		throw new Error('Invalid saved game')
	}
	const level = LEVELS[value.difficulty]
	if (
		!finite(value.seed) ||
		!Number.isInteger(value.seed) ||
		value.seed < 0 ||
		value.seed > 0xffffffff ||
		!Array.isArray(value.revealed) ||
		value.revealed.length !== level.size ** 2 ||
		value.revealed.some((v) => typeof v !== 'boolean') ||
		value.revealed.every(Boolean) ||
		!finite(value.selected) ||
		!Number.isInteger(value.selected) ||
		value.selected < -1 ||
		value.selected >= level.colors ||
		!finite(value.elapsed) ||
		value.elapsed < 0 ||
		!finite(value.zoom) ||
		value.zoom < 0.7 ||
		value.zoom > 1.6 ||
		!finite(value.left) ||
		value.left < 0 ||
		!finite(value.top) ||
		value.top < 0
	)
		throw new Error('Invalid saved game')
	return value as SavedGame
}

export function validateResume(saved: SavedGame, puzzle: Puzzle) {
	if (
		saved.seed !== puzzle.seed ||
		saved.difficulty !== puzzle.difficulty ||
		puzzle.clues.some((clue, i) => clue && !saved.revealed[i]) ||
		(saved.selected >= 0 &&
			!saved.revealed.some((open, i) => open && puzzle.answer[i] === saved.selected))
	) {
		throw new Error('Saved game does not match puzzle')
	}
}

export function saveGame(storage: StoragePort, saved: SavedGame) {
	const raw = JSON.stringify(saved)
	parseSave(raw)
	storage.setItem(SAVE_KEY, raw)
}

export function readBest(storage: StoragePort, difficulty: Difficulty): number | null {
	const raw = storage.getItem(BEST_KEY)
	if (!raw) return null
	const value: unknown = JSON.parse(raw)
	if (!value || typeof value !== 'object') return null
	const time = (value as Record<string, unknown>)[difficulty]
	return finite(time) && time >= 0 ? time : null
}

export function recordBest(storage: StoragePort, difficulty: Difficulty, elapsed: number) {
	if (!finite(elapsed) || elapsed < 0) throw new Error('Invalid time')
	const best = Object.fromEntries(
		Object.keys(LEVELS).map((key) => [key, readBest(storage, key as Difficulty)]),
	)
	best[difficulty] = Math.min(best[difficulty] ?? Infinity, elapsed)
	storage.setItem(BEST_KEY, JSON.stringify(best))
	return best[difficulty]
}
