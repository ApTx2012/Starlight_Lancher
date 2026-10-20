import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { collectSkinSiteMessages } from './skin-site-messages.mjs'

test('all skin-site messages used in source exist in both release language catalogs', () => {
	const messages = collectSkinSiteMessages()
	assert.ok(messages.length > 100, 'The check must scan the actual UI')
	for (const locale of ['en-US', 'zh-CN']) {
		const catalog = JSON.parse(
			fs.readFileSync(`apps/app-frontend/src/locales/${locale}/index.json`, 'utf8'),
		)
		const missing = messages.filter(({ id }) => !catalog[id]?.message)
		assert.deepEqual(
			missing.map(({ id }) => id),
			[],
			`${locale} has uncatalogued UI messages`,
		)
	}
})

test('Chinese login and announcement labels do not fall back to English', () => {
	const catalog = JSON.parse(
		fs.readFileSync('apps/app-frontend/src/locales/zh-CN/index.json', 'utf8'),
	)
	for (const id of [
		'app.skin-site.login.title',
		'app.skin-site.login.username',
		'app.skin-site.login.password-hint',
		'app.skin-site.home.announcements.title',
		'app.skin-site.home.announcements.failed',
	]) {
		assert.match(catalog[id]?.message ?? '', /\p{Script=Han}/u, id)
	}
})
