import assert from 'node:assert/strict'
import test from 'node:test'

import { createTaggedModProgress } from './tagged-mod-progress.ts'

const parent = (id = 'parent', fraction: number | null = 0, error = '') => ({
	loader_uuid: id,
	fraction,
	message: 'Applying updates',
	event: { type: 'hosted_pack_sync', instance_id: 'one', error },
})
const file = (id: string, fraction: number | null, batch = 'batch', error = '') => ({
	loader_uuid: id,
	fraction,
	total: 100,
	message: 'Downloading',
	event: {
		type: 'hosted_mod_download',
		instance_id: 'one',
		instance_name: 'Server',
		batch_id: batch,
		file_name: id,
		error,
	},
})

test('parallel files keep independent progress and wait for installation to complete', () => {
	const state = createTaggedModProgress()
	state.update(parent())
	assert.equal(state.update(file('first', 0.25)), true)
	assert.equal(state.update(file('second', 0.6)), false)
	const group = state.groups.get('batch')!
	assert.equal(group.files.get('first')!.current, 25)
	assert.equal(group.files.get('second')!.current, 60)
	state.update(file('first', null))
	state.update(file('first', 0.1))
	assert.equal(group.files.get('first')!.current, 100)
	state.update(file('second', null))
	assert.equal(group.done, false)
	state.update(parent('parent', null))
	assert.equal(group.done, true)
	assert.equal(group.error, '')
})

test('failures retain downloaded bytes and retry discards all late events from the old attempt', () => {
	const state = createTaggedModProgress()
	state.update(parent())
	state.update(file('first', 0.4))
	state.update(file('first', null, 'batch', 'network failed'))
	state.update(parent('parent', null, 'network failed'))
	assert.equal(state.groups.get('batch')!.files.get('first')!.current, 40)
	assert.equal(state.groups.get('batch')!.error, 'network failed')
	state.reset('one')
	state.update(parent('new-parent'))
	state.update(file('new-file', 0.2, 'new-batch'))
	state.update(parent('parent', 0.9))
	state.update(parent('parent', null, 'old error'))
	state.update(file('first', null))
	assert.deepEqual([...state.groups.keys()], ['new-batch'])
	assert.equal(state.groups.get('new-batch')!.done, false)
})

test('native retry and resetting one instance leave other instance downloads alone', () => {
	const state = createTaggedModProgress()
	state.update(parent())
	state.update(file('first', 0))
	const other = file('other', 0.8, 'other-batch')
	other.event.instance_id = 'two'
	state.update(other)
	state.update(parent('new-parent'))
	state.update(file('new-file', 0.3, 'new-batch'))
	state.update(parent('parent', 0.5))
	assert.deepEqual([...state.groups.keys()], ['other-batch', 'new-batch'])
	state.reset('one')
	assert.deepEqual([...state.groups.keys()], ['other-batch'])
})
