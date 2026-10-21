import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

const testGlobal = globalThis as unknown as {
	skinImageTestFetch: (url: string) => Promise<Response>
}
const hooks = registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === '@tauri-apps/plugin-http') {
			return {
				url: 'data:text/javascript,export const fetch=(...args)=>globalThis.skinImageTestFetch(...args)',
				shortCircuit: true,
			}
		}
		return nextResolve(specifier, context)
	},
})
const { fetchImageAsDataUrl } = await import('./skin-site-render.ts')
hooks.deregister()

test.beforeEach((t) => {
	t.mock.method(globalThis, 'fetch', async () => {
		throw new TypeError('Cross-origin image request blocked')
	})
	const previousReader = Object.getOwnPropertyDescriptor(globalThis, 'FileReader')
	Object.defineProperty(globalThis, 'FileReader', {
		configurable: true,
		value: class {
			result: string | null = null
			onload?: () => void
			onerror?: () => void
			readAsDataURL(blob: Blob) {
				void blob.arrayBuffer().then(
					(bytes) => {
						this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`
						this.onload?.()
					},
					() => this.onerror?.(),
				)
			}
		},
	})
	t.after(() => {
		if (previousReader) Object.defineProperty(globalThis, 'FileReader', previousReader)
		else Reflect.deleteProperty(globalThis, 'FileReader')
	})
})

test('skin textures download through the native client when browser CORS blocks the site', async () => {
	testGlobal.skinImageTestFetch = async () =>
		new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } })
	assert.equal(
		await fetchImageAsDataUrl('https://skin.starlight.cool/yggdrasil/textures/test'),
		'data:image/png;base64,iVBORw==',
	)
})

test('failed image downloads report the HTTP error instead of accepting the response as a texture', async () => {
	testGlobal.skinImageTestFetch = async () => new Response('Unavailable', { status: 503 })
	await assert.rejects(
		fetchImageAsDataUrl('https://skin.starlight.cool/yggdrasil/textures/test'),
		/HTTP 503/,
	)
})
