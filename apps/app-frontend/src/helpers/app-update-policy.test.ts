import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldDelayAppUpdate } from './app-update-policy.ts'

const now = Date.parse('2026-10-21T08:00:00Z')
const recent = { publishedAt: '2026-10-21T07:00:00Z' }

test('administrator rollbacks bypass the normal release waiting period', () => {
	assert.equal(shouldDelayAppUpdate({ ...recent, rollback: true }, 'release', false, now), false)
	assert.equal(shouldDelayAppUpdate({ rollback: true }, 'release', false, now), false)
})

test('ordinary releases retain the 24-hour delay and missing dates remain delayed', () => {
	assert.equal(shouldDelayAppUpdate(recent, 'release', false, now), true)
	assert.equal(shouldDelayAppUpdate({}, 'release', false, now), true)
	assert.equal(
		shouldDelayAppUpdate({ publishedAt: '2026-10-20T08:00:00Z' }, 'release', false, now),
		false,
	)
})

test('beta, forced updates and immediate fetching still bypass the delay', () => {
	assert.equal(shouldDelayAppUpdate(recent, 'beta', false, now), false)
	assert.equal(shouldDelayAppUpdate({ ...recent, forceUpdate: true }, 'release', false, now), false)
	assert.equal(shouldDelayAppUpdate(recent, 'release', true, now), false)
})
