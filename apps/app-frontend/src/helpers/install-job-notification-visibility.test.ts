import assert from 'node:assert/strict'
import test from 'node:test'

import type { InstallJobSnapshot, InstallJobStatus } from './install.ts'
import { createInstallJobNotificationFilter } from './install-job-notification-visibility.ts'

function job(jobId: string, status: InstallJobStatus): InstallJobSnapshot {
	return { job_id: jobId, status } as InstallJobSnapshot
}

test('does not resurrect failures that finished before the notification surface started', () => {
	const oldFailure = job('old-failure', 'failed')
	const filter = createInstallJobNotificationFilter([oldFailure, job('old-success', 'succeeded')])

	assert.deepEqual(filter([oldFailure, job('old-success', 'succeeded')]), [])
	assert.deepEqual(filter([oldFailure, job('current', 'running')]).map((item) => item.job_id), [
		'current',
	])
})

test('keeps an observed task visible when it finishes', () => {
	const filter = createInstallJobNotificationFilter([job('old-failure', 'failed')])

	assert.deepEqual(filter([job('current', 'running')]).map((item) => item.job_id), ['current'])
	assert.deepEqual(filter([job('current', 'failed')]).map((item) => item.job_id), ['current'])
	assert.deepEqual(filter([job('current', 'succeeded')]).map((item) => item.job_id), ['current'])
})

test('shows a newly received failure even if its active phase completed too quickly to observe', () => {
	const filter = createInstallJobNotificationFilter([job('old-failure', 'failed')])

	assert.deepEqual(filter([job('new-failure', 'failed')]).map((item) => item.job_id), [
		'new-failure',
	])
})
