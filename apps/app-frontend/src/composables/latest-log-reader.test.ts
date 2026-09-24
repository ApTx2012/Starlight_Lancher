import assert from 'node:assert/strict'
import test from 'node:test'

import { createLatestLogReader } from './latest-log-reader.ts'

test('follows file-only output after startup, re-entry, clear and file rotation', async () => {
	let file = ''
	let displayed = 'stdout startup'
	const reader = createLatestLogReader(
		async (cursor) => ({
			cursor: file.length,
			output: file.slice(cursor > file.length ? 0 : cursor),
			new_file: cursor > file.length,
		}),
		(output, replace) => {
			displayed = (replace ? '' : displayed) + output
		},
	)
	await reader.refresh()
	assert.equal(reader.active, false)
	file = 'Startup complete\n'
	await reader.refresh()
	assert.equal(reader.active, true)
	assert.equal(displayed, file) // Replaces stdout, not appended a second time.
	file += 'Joined world\nDisconnected\n'
	await reader.refresh()
	await reader.refresh() // Re-entering the view must not replay history.
	assert.equal(displayed, file)
	reader.clear()
	displayed = ''
	file += 'After clear\n'
	await reader.refresh()
	assert.equal(displayed, 'After clear\n')
	file = 'Rotated\n'
	await reader.refresh()
	assert.equal(displayed, file)
	file = ''
	await reader.refresh()
	assert.equal(displayed, '')
	assert.equal(reader.active, false)
	file = 'File recreated\n'
	await reader.refresh()
	assert.equal(displayed, file)
	reader.reset()
	assert.equal(reader.active, false)
	file = 'New session with a longer file\n'
	await reader.refresh()
	assert.equal(displayed, file)
})

test('serializes reads, ignores pre-restart responses, consumes pre-clear responses', async () => {
	const resolvers: ((value: { cursor: number; output: string; new_file: boolean }) => void)[] = []
	const cursors: number[] = []
	const output: string[] = []
	const reader = createLatestLogReader(
		(cursor) => {
			cursors.push(cursor)
			return new Promise((resolve) => resolvers.push(resolve))
		},
		(text) => output.push(text),
	)
	const old = reader.refresh()
	const concurrent = reader.refresh()
	assert.deepEqual(cursors, [0])
	reader.reset()
	const fresh = reader.refresh()
	resolvers[0]({ cursor: 100, output: 'old session', new_file: false })
	await Promise.all([old, concurrent])
	assert.deepEqual(output, [])
	reader.clear()
	resolvers[1]({ cursor: 20, output: 'before clear', new_file: false })
	await fresh
	assert.deepEqual(output, [])
	const next = reader.refresh()
	assert.deepEqual(cursors, [0, 0, 20])
	resolvers[2]({ cursor: 40, output: 'after clear\n', new_file: false })
	await next
	assert.deepEqual(output, ['after clear\n'])
})

test('a temporary read failure keeps the cursor and retries without duplicating output', async () => {
	let failed = true
	const output: string[] = []
	const reader = createLatestLogReader(
		async (cursor) => {
			assert.equal(cursor, 0)
			if (failed) throw new Error('file temporarily unavailable')
			return { cursor: 6, output: 'ready\n', new_file: false }
		},
		(text) => output.push(text),
	)
	await assert.rejects(reader.refresh())
	assert.equal(reader.active, false)
	failed = false
	await reader.refresh()
	assert.deepEqual(output, ['ready\n'])
})

test('joins split lines and flushes the final unterminated line on exit', async () => {
	let chunk = 'Startup\n[Render thread/INFO] Join'
	let cursor = 0
	let displayed = ''
	const reader = createLatestLogReader(
		async () => ({
			cursor: (cursor += chunk.length),
			output: chunk,
			new_file: false,
		}),
		(text, replace) => {
			displayed = (replace ? '' : displayed) + text
		},
	)
	await reader.refresh()
	assert.equal(displayed, 'Startup\n')
	chunk = 'ed world\nLast line'
	await reader.refresh()
	assert.equal(displayed, 'Startup\n[Render thread/INFO] Joined world\n')
	reader.flush()
	assert.equal(displayed, 'Startup\n[Render thread/INFO] Joined world\nLast line')
})
