import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { publishSkinSite } from './publish-skin-site.mjs'

async function fixture(t) {
	const directory = await mkdtemp(path.join(tmpdir(), 'skin-site-publish-'))
	t.after(() => rm(directory, { recursive: true, force: true }))
	const archivePath = path.join(directory, 'Starlight_Launcher_1.0.2-beta10_skin-site-update.zip')
	const bytes = Buffer.from('a small archive split into several chunks')
	await writeFile(archivePath, bytes)
	return { archivePath, bytes }
}

function apiFixture(bytes, options = {}) {
	const chunks = new Map()
	const events = []
	const release = { id: 17, version: '1.0.2-beta10', active: false }
	let state = 'uploading'
	let failedOnce = false
	if (options.resume) chunks.set(0, bytes.subarray(0, 8))
	const status = () => ({
		id: 'session-1',
		chunkSize: 8,
		size: bytes.length,
		received: [...chunks.values()].reduce((total, part) => total + part.length, 0),
		receivedChunks: [...chunks.keys()],
		uploadConcurrency: 3,
		state,
		...(state === 'ready' ? { release } : {}),
		...(state === 'failed' ? { errorMessage: 'Invalid archive manifest' } : {}),
	})
	const reply = (payload) => Response.json({ success: true, payload })
	return {
		chunks,
		events,
		fetch: async (url, init) => {
			assert.equal(init.headers.Authorization, 'Bearer test-token')
			const route = new URL(url).pathname.replace('/starlight/', '')
			events.push(route)
			if (route === 'launcher/admin/uploads') {
				assert.equal(JSON.parse(init.body).size, bytes.length)
				assert.equal(JSON.parse(init.body).forceUpdate, false)
				return reply({ ...status(), ...(options.invalidChunkSize ? { chunkSize: 0 } : {}) })
			}
			if (route.includes('/chunks/')) {
				if (options.rejectChunks) return new Response('too large', { status: 413 })
				if (options.retryChunk && !failedOnce) {
					failedOnce = true
					return new Response('temporary failure', { status: 503 })
				}
				const index = Number(route.split('/').at(-1))
				const file = init.body.get('file')
				assert.equal(file.name, 'chunk.bin')
				chunks.set(index, Buffer.from(await file.arrayBuffer()))
				return reply(status())
			}
			if (route.endsWith('/complete')) {
				assert.deepEqual(
					Buffer.concat([...chunks].sort(([a], [b]) => a - b).map(([, part]) => part)),
					bytes,
				)
				state = 'processing'
				return reply(status())
			}
			if (route.endsWith('/activate')) {
				assert.equal(state, 'ready')
				return options.activationFailure
					? Response.json({ success: false, errorMessage: 'Activation denied' })
					: reply({ ...release, active: true })
			}
			if (route === 'launcher/admin/uploads/session-1') {
				if (state === 'processing' && !options.stuck)
					state = options.processingFailure ? 'failed' : 'ready'
				return reply({
					...status(),
					...(options.wrongVersion && state === 'ready'
						? { release: { ...release, version: '1.0.2-beta9' } }
						: {}),
				})
			}
			throw new Error(`Unexpected route ${route}`)
		},
	}
}

function settings(archivePath, api) {
	return {
		archivePath,
		tag: 'v1.0.2-beta10',
		token: 'test-token',
		baseUrl: 'https://skin.example',
		fetchImpl: api.fetch,
		pollIntervalMs: 1,
		sleep: async () => {},
		log: () => {},
	}
}

test('uploads exact bounded chunks, retries temporary errors, then completes and activates', async (t) => {
	const { archivePath, bytes } = await fixture(t)
	const api = apiFixture(bytes, { retryChunk: true })
	const result = await publishSkinSite(settings(archivePath, api))
	assert.equal(result.active, true)
	assert.equal(api.chunks.size, Math.ceil(bytes.length / 8))
	assert.ok([...api.chunks.values()].every((part) => part.length <= 8))
	assert.equal(api.events.at(-1), 'launcher/admin/17/activate')
})

for (const [name, options, error] of [
	['HTTP upload rejection', { rejectChunks: true }, /413/],
	['archive processing failure', { processingFailure: true }, /Invalid archive manifest/],
	['application-level activation failure', { activationFailure: true }, /Activation denied/],
	['invalid server chunk size', { invalidChunkSize: true }, /invalid upload status/],
	['mismatched release version', { wrongVersion: true }, /version other than/],
]) {
	test(`fails explicitly on ${name}`, async (t) => {
		const { archivePath, bytes } = await fixture(t)
		const api = apiFixture(bytes, options)
		await assert.rejects(publishSkinSite(settings(archivePath, api)), error)
		if (!options.activationFailure)
			assert.ok(!api.events.some((event) => event.endsWith('/activate')))
	})
}

test('fails instead of hanging when processing never finishes', async (t) => {
	const { archivePath, bytes } = await fixture(t)
	const api = apiFixture(bytes, { stuck: true })
	let now = 0
	await assert.rejects(
		publishSkinSite({
			...settings(archivePath, api),
			timeoutMs: 10,
			now: () => now,
			sleep: async () => {
				now += 5
			},
		}),
		/timed out/i,
	)
})

test('missing credentials fail before any network request', async (t) => {
	const { archivePath } = await fixture(t)
	await assert.rejects(
		publishSkinSite({
			...settings(archivePath, { fetch: () => assert.fail('Unexpected network request') }),
			token: '',
		}),
		/SKIN_SITE_CI_UPLOAD_TOKEN/,
	)
})

test('resumes server-acknowledged chunks without uploading them again', async (t) => {
	const { archivePath, bytes } = await fixture(t)
	const api = apiFixture(bytes, { resume: true })
	await publishSkinSite(settings(archivePath, api))
	assert.ok(!api.events.some((event) => event.endsWith('/chunks/0')))
})

test('CLI emits a GitHub error and exits nonzero when credentials are missing', () => {
	const result = spawnSync(
		process.execPath,
		['scripts/axolotl/publish-skin-site.mjs', 'missing.zip', 'v1.0.2-beta10'],
		{ encoding: 'utf8', env: { ...process.env, SKIN_SITE_TOKEN: '' } },
	)
	assert.equal(result.status, 1)
	assert.match(result.stderr, /::error::.*SKIN_SITE_CI_UPLOAD_TOKEN/)
})
