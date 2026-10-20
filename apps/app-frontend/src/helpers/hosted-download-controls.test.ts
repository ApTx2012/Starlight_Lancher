import assert from 'node:assert/strict'
import test from 'node:test'

import {
	hostedDownloadActions,
	hostedDownloadState,
	runHostedDownloadAction,
	runHostedDownloadControl,
} from './hosted-download-controls.ts'

test('only a controllable parent hosted task offers pause, resume and stop', () => {
	const bar = {
		bar_type: {
			type: 'hosted_pack_sync',
			instance_id: 'one',
			state: 'running' as const,
			can_pause: true,
			can_cancel: true,
		},
	}
	assert.deepEqual(hostedDownloadActions(bar), ['pause', 'cancel'])
	assert.deepEqual(hostedDownloadActions({ bar_type: { ...bar.bar_type, state: 'paused' } }), [
		'resume',
		'cancel',
	])
	for (const state of ['finalizing', 'canceling'] as const) {
		assert.deepEqual(hostedDownloadActions({ bar_type: { ...bar.bar_type, state } }), [])
	}
	assert.deepEqual(
		hostedDownloadActions({ bar_type: { ...bar.bar_type, type: 'hosted_mod_download' } }),
		[],
	)
	assert.deepEqual(
		hostedDownloadActions({ bar_type: { type: 'hosted_pack_sync', instance_id: 'one' } }),
		[],
	)
})

test('failed and canceled hosted tasks offer direct retry, preserving terminal state', () => {
	for (const state of ['failed', 'canceled'] as const) {
		const bar = {
			bar_type: { type: 'hosted_pack_sync', instance_id: 'one', state, error: 'failure' },
		}
		assert.deepEqual(hostedDownloadActions(bar), ['retry'])
		assert.equal(hostedDownloadState(bar), state)
	}
	assert.equal(hostedDownloadState({ bar_type: { error: 'old backend failure' } }), 'failed')
})

test('resume refreshes the session before invoking controls; pause and stop need no session', async () => {
	const calls: string[] = []
	const deps = {
		prepareSession: async () => {
			calls.push('session')
		},
		invoke: async (command: string, args: { instanceId: string }) => {
			calls.push(`${command}:${args.instanceId}`)
		},
	}
	await runHostedDownloadControl('resume', 'one', deps)
	await runHostedDownloadControl('pause', 'one', deps)
	await runHostedDownloadControl('cancel', 'one', deps)
	assert.deepEqual(calls, [
		'session',
		'plugin:install|hosted_resume:one',
		'plugin:install|hosted_pause:one',
		'plugin:install|hosted_cancel:one',
	])
})

test('session refresh failures prevent resume', async () => {
	await assert.rejects(
		runHostedDownloadControl('resume', 'one', {
			prepareSession: async () => {
				throw new Error('signed out')
			},
			invoke: async () => {
				assert.fail('resume must not run')
			},
		}),
		/signed out/,
	)
})

test('retry immediately restarts the existing hosted instance through the manager', async () => {
	const calls: string[] = []
	await runHostedDownloadAction('retry', 'existing-instance', {
		retryHosted: async (instanceId) => {
			calls.push(instanceId)
		},
		control: async () => {
			assert.fail('retry must use the full hosted transaction')
		},
	})
	assert.deepEqual(calls, ['existing-instance'])
})
