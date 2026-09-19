import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(
	new URL('../../apps/app/src/skin_editor_bridge.js', import.meta.url),
	'utf8',
)

function createFrame(url = 'http://axolotl-skin.localhost/index.html?embed=skin') {
	const listeners = new Map()
	const messages = []
	const window = {
		parent: { postMessage: (message) => messages.push(message) },
		addEventListener: (type, handler) => listeners.set(type, handler),
	}
	runInNewContext(source, { window, location: new URL(url), URLSearchParams })
	return { window, listeners, messages }
}

test('reports startup exceptions to the launcher', () => {
	const frame = createFrame()
	frame.listeners.get('error')({ message: 'ReferenceError: missing editor dependency' })
	assert.equal(frame.messages[0].type, 'axolotl-skin-load-error')
	assert.match(frame.messages[0].error, /missing editor dependency/)
})

test('reports rejected module imports even when the editor handles the rejection', async () => {
	const frame = createFrame()
	frame.window.blockbenchBundleReady = Promise.reject(new Error('Failed to fetch editor module'))
	frame.listeners.get('DOMContentLoaded')()
	await Promise.resolve()
	assert.equal(frame.messages[0].error, 'Failed to fetch editor module')
})

test('does not install the bridge on unrelated pages', () => {
	for (const url of ['https://skin.starlight.cool/', 'http://axolotl-skin.localhost/index.html']) {
		assert.equal(createFrame(url).listeners.size, 0)
	}
})

test('ignores resize observer notifications', () => {
	const frame = createFrame()
	frame.listeners.get('error')({
		message: 'ResizeObserver loop completed with undelivered notifications.',
	})
	assert.equal(frame.messages.length, 0)
})
