import assert from 'node:assert/strict'
import test from 'node:test'

import { createHostedDownloadFailures } from './hosted-download-failures.ts'

test('retry clears only its own failure before progress arrives and ignores late old events', () => {
	const state = createHostedDownloadFailures()
	const failed = (instanceId: string, loader: string, error: string) => ({
		fraction: null,
		loader_uuid: loader,
		event: { type: 'hosted_pack_sync', instance_id: instanceId, instance_name: instanceId, error },
	})
	const oldFailure = failed('one', 'old', 'old failure')
	state.update(oldFailure)
	state.update(failed('two', 'other', 'other failure'))
	state.begin('one', state.values())
	assert.equal(state.has('one'), false)
	assert.equal(state.has('two'), true)
	assert.equal(state.isRetired('old'), true)
	state.update(oldFailure)
	assert.equal(state.has('one'), false)
	state.update(failed('one', 'new', 'new failure'))
	state.update({ ...oldFailure, fraction: 0.5 })
	assert.equal(
		state.values().find((bar) => bar.bar_type?.instance_id === 'one')?.message,
		'new failure',
	)
})

test('a new native task retires the previous failed task without a frontend retry', () => {
	const state = createHostedDownloadFailures()
	const old = {
		fraction: null,
		loader_uuid: 'old',
		event: { type: 'hosted_pack_sync', instance_id: 'instance', error: 'old failure' },
	}
	state.update(old)
	state.update({ fraction: 0, loader_uuid: 'new', event: { ...old.event, error: null } })
	state.update(old)
	assert.equal(state.has('instance'), false)
})

test('late failure from an older active task cannot replace the new task', () => {
	const state = createHostedDownloadFailures()
	const event = { type: 'hosted_pack_sync', instance_id: 'instance' }
	state.update({ fraction: 0.5, loader_uuid: 'old', event })
	state.update({ fraction: 0, loader_uuid: 'new', event })
	state.update({ fraction: null, loader_uuid: 'old', event: { ...event, error: 'old failure' } })
	assert.equal(state.has('instance'), false)
	assert.equal(state.isRetired('old'), true)
	assert.equal(state.isRetired('new'), false)
})
