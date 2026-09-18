import assert from 'node:assert/strict'
import test from 'node:test'

import {
	hostedRetryRoute,
	hostedRuntimeRetryInstanceId,
	retryInstallJob,
} from './hosted-install-retry.ts'
import type { InstallJobSnapshot } from './install.ts'

function job(overrides: Partial<InstallJobSnapshot> = {}): InstallJobSnapshot {
	return {
		job_id: 'job',
		instance_id: 'local:instance',
		source_instance_id: null,
		instance_deleted: false,
		kind: 'install_existing_instance',
		status: 'failed',
		execution_mode: 'normal',
		provider: 'minecraft',
		target: { type: 'existing_instance', instance_id: 'local:instance' },
		phase: 'downloading_minecraft',
		progress: null,
		details: { type: 'empty' },
		parallel: null,
		display: null,
		error: null,
		rollback_error: null,
		pause_reason: null,
		upgrade_result: null,
		created: '2026-09-18T00:00:00Z',
		modified: '2026-09-18T00:00:00Z',
		finished: '2026-09-18T00:00:01Z',
		summary: {
			files_completed: 0,
			files_total: null,
			bytes_downloaded: 0,
			bytes_total: null,
			speed_bytes_per_second: null,
			eta_seconds: null,
			source: null,
			fallback_count: 0,
		},
		items: [],
		...overrides,
	}
}

test('StarLight runtime retries keep the existing instance identity', () => {
	assert.equal(hostedRuntimeRetryInstanceId(job()), 'local:instance')
	assert.equal(
		hostedRuntimeRetryInstanceId(
			job({ instance_id: null, target: { type: 'existing_instance', instance_id: 'target' } }),
		),
		'target',
	)
})

test('deleted and unrelated install jobs do not enter the StarLight runtime retry path', () => {
	assert.equal(hostedRuntimeRetryInstanceId(job({ instance_deleted: true })), null)
	assert.equal(hostedRuntimeRetryInstanceId(job({ kind: 'create_instance' })), null)
})

test('the hosted retry link targets the current instance content route', () => {
	assert.equal(
		hostedRetryRoute('local:instance/with space'),
		'/instance/local%3Ainstance%2Fwith%20space',
	)
	assert.doesNotMatch(hostedRetryRoute('local:instance'), /\/mods$/)
})

test('a StarLight runtime failure retries the complete hosted transaction only', async () => {
	const calls: string[] = []
	const result = await retryInstallJob(job(), {
		getInstanceMode: async (instanceId) => {
			calls.push(`mode:${instanceId}`)
			return 'starlight'
		},
		retryHosted: async (instanceId, sourceJobId) => {
			calls.push(`hosted:${instanceId}:${sourceJobId}`)
		},
		retryGeneric: async (jobId) => {
			calls.push(`generic:${jobId}`)
			return job()
		},
	})
	assert.equal(result, null)
	assert.deepEqual(calls, ['mode:local:instance', 'hosted:local:instance:job'])
})

test('a Local runtime failure keeps the generic retry path', async () => {
	const replacement = job({ job_id: 'replacement', status: 'queued' })
	const calls: string[] = []
	const result = await retryInstallJob(job(), {
		getInstanceMode: async () => 'local',
		retryHosted: async () => {
			calls.push('hosted')
		},
		retryGeneric: async (jobId) => {
			calls.push(`generic:${jobId}`)
			return replacement
		},
	})
	assert.equal(result, replacement)
	assert.deepEqual(calls, ['generic:job'])
})

test('mode lookup failures never fall back to an incomplete generic retry', async () => {
	let genericCalls = 0
	await assert.rejects(
		retryInstallJob(job(), {
			getInstanceMode: async () => {
				throw new Error('instance unavailable')
			},
			retryHosted: async () => {},
			retryGeneric: async () => {
				genericCalls++
				return job()
			},
		}),
		/instance unavailable/,
	)
	assert.equal(genericCalls, 0)
})
