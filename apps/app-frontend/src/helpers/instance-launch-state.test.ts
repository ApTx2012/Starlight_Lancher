import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isInstanceLaunching, launchOnce } from './instance-launch-state.ts'

test('launches different instances concurrently and coalesces repeated pending clicks', async () => {
	let finishA!: (value: string) => void
	let starts = 0
	const first = launchOnce('a', () => {
		starts++
		return new Promise<string>((resolve) => {
			finishA = resolve
		})
	})
	assert.equal(
		launchOnce('a', async () => 'unexpected duplicate'),
		first,
	)
	assert.equal(isInstanceLaunching('a'), true)
	assert.equal(isInstanceLaunching('b'), false)
	assert.equal(await launchOnce('b', async () => 'b started'), 'b started')
	assert.equal(isInstanceLaunching('a'), true)
	finishA('a started')
	assert.equal(await first, 'a started')
	assert.equal(starts, 1)
	assert.equal(isInstanceLaunching('a'), false)
	assert.equal(await launchOnce('a', async () => 'second window'), 'second window')
})

test('failed launch releases only its own pending state and can retry', async () => {
	await assert.rejects(
		launchOnce('failed', async () => {
			throw new Error('launch failed')
		}),
		/launch failed/,
	)
	assert.equal(isInstanceLaunching('failed'), false)
	assert.equal(await launchOnce('failed', async () => 'retry'), 'retry')
})
