import assert from 'node:assert/strict'
import test from 'node:test'

import {
	createLiveLogReconciler,
	type LiveLogSnapshot,
} from './live-log-reconciler.ts'

test('merges the authoritative snapshot with queued events without gaps or duplicates', async () => {
	let resolveSnapshot!: (snapshot: LiveLogSnapshot) => void
	const displayed: number[] = []
	const reconciler = createLiveLogReconciler(
		() =>
			new Promise((resolve) => {
				resolveSnapshot = resolve
			}),
		(snapshot) => {
			displayed.splice(
				0,
				displayed.length,
				...snapshot.lines.map((line) => line.sequence),
			)
		},
		(event) => displayed.push(event.last_sequence),
	)

	const syncing = reconciler.sync()
	reconciler.accept({ first_sequence: 3, last_sequence: 3 })
	resolveSnapshot({
		lines: [
			{ sequence: 1, message: 'one' },
			{ sequence: 2, message: 'two' },
		],
		last_sequence: 2,
	})
	await syncing
	assert.deepEqual(displayed, [1, 2, 3])

	await reconciler.accept({ first_sequence: 3, last_sequence: 3 })
	assert.deepEqual(displayed, [1, 2, 3])
})

test('resynchronizes when an event sequence reveals a missed batch', async () => {
	const displayed: number[] = []
	let loads = 0
	const reconciler = createLiveLogReconciler(
		async () => {
			loads++
			return {
				lines: [1, 2, 3, 4].map((sequence) => ({
					sequence,
					message: String(sequence),
				})),
				last_sequence: 4,
			}
		},
		(snapshot) => {
			displayed.splice(
				0,
				displayed.length,
				...snapshot.lines.map((line) => line.sequence),
			)
		},
		(event) => displayed.push(event.last_sequence),
	)

	await reconciler.accept({ first_sequence: 4, last_sequence: 4 })
	assert.equal(loads, 1)
	assert.deepEqual(displayed, [1, 2, 3, 4])
})
