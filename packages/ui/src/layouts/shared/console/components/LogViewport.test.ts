import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
	new URL('./LogViewport.vue', import.meta.url),
	'utf8',
)

test('log rows use content-driven grid height for wrapped lines', () => {
	assert.match(source, /grid-template-columns:\s*52px minmax\(0, 1fr\)/)
	assert.match(source, /\.log-line-content\s*\{[^}]*display:\s*block/s)
	assert.match(
		source,
		/\.log-viewport-wrap \.log-line\s*\{[^}]*white-space:\s*pre-wrap/s,
	)
	assert.doesNotMatch(
		source,
		/content-visibility|contain-intrinsic-size|estimateHeight|heightPrefix/,
	)
})
