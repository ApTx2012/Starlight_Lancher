import assert from 'node:assert/strict'
import test from 'node:test'

import {
	openSkinSiteLogin,
	receiveSkinSiteSession,
	resetSkinSiteSession,
	SKIN_SITE_ORIGIN,
	skinSiteFrameUrl,
	skinSiteStatus,
	skinSiteUser,
} from './skin-site-session.ts'

test('skin site session accepts only the embedded origin and window, and redirects after verification', () => {
	const frame = {} as Window
	const message = (status: string, user?: unknown) =>
		({
			origin: SKIN_SITE_ORIGIN,
			source: frame,
			data: { type: 'starlight-skin-session', status, user },
		}) as MessageEvent
	resetSkinSiteSession()
	openSkinSiteLogin()
	assert.equal(skinSiteFrameUrl.value, `${SKIN_SITE_ORIGIN}/login`)
	const signedIn = message('signed-in', {
		uuid: 'test-user',
		username: '测试用户',
		jwt: 'must-not-copy',
	})
	assert.equal(
		receiveSkinSiteSession({ ...signedIn, origin: 'https://evil.example' } as MessageEvent, frame),
		false,
	)
	assert.equal(receiveSkinSiteSession(signedIn, {} as Window), false)
	assert.equal(receiveSkinSiteSession(message('signed-in', {}), frame), false)
	assert.equal(skinSiteUser.value, null)
	assert.equal(receiveSkinSiteSession(signedIn, frame), true)
	assert.deepEqual(skinSiteUser.value, { uuid: 'test-user', username: '测试用户' })
	assert.equal(skinSiteStatus.value, 'signed-in')
	assert.equal(skinSiteFrameUrl.value, `${SKIN_SITE_ORIGIN}/profile`)
	assert.equal(receiveSkinSiteSession(message('checking'), frame), true)
	assert.equal(skinSiteUser.value, null)
	receiveSkinSiteSession(message('signed-in', { uuid: 'second', username: '另一个账号' }), frame)
	assert.deepEqual(skinSiteUser.value, { uuid: 'second', username: '另一个账号' })
	receiveSkinSiteSession(message('signed-out'), frame)
	assert.equal(skinSiteUser.value, null)
	assert.equal(skinSiteStatus.value, 'signed-out')
	receiveSkinSiteSession(message('error'), frame)
	assert.equal(skinSiteStatus.value, 'error')
	resetSkinSiteSession()
})
