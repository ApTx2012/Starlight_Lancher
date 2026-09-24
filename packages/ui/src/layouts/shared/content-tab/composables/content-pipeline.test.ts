import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test, { type TestContext } from 'node:test'

import { effectScope, nextTick, ref } from 'vue'

import type { ContentItem } from '../types.ts'

// Keep the real Vue state, search, and filter pipeline; replace only the UI's
// translation provider, which normally requires an application context.
const hooks = registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === '#ui/composables/i18n' || specifier === '../composables/i18n') {
			return {
				url: `data:text/javascript,${encodeURIComponent('export const defineMessage=x=>x, defineMessages=x=>x, useVIntl=()=>({formatMessage:x=>x.defaultMessage})')}`,
				shortCircuit: true,
			}
		}
		if (specifier.startsWith('#ui/')) {
			return nextResolve(
				new URL(`../../../../${specifier.slice(4)}.ts`, import.meta.url).href,
				context,
			)
		}
		if (specifier.startsWith('./') && !specifier.endsWith('.ts')) {
			return nextResolve(`${specifier}.ts`, context)
		}
		return nextResolve(specifier, context)
	},
})
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
const { useContentPipeline } = await import('./content-pipeline.ts')
hooks.deregister()
if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
else Reflect.deleteProperty(globalThis, 'window')

function item(id: string, overrides: Partial<ContentItem> = {}): ContentItem {
	return {
		id,
		project: { id, title: id, slug: id, icon_url: null },
		file_name: `${id}.jar`,
		project_type: 'mod',
		update: null,
		origin_provider: null,
		provider_refs: [],
		enabled: true,
		...overrides,
	}
}

function fixture(t: TestContext) {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	const update = {
		provider: 'modrinth' as const,
		project_id: 'project',
		current_version_id: 'v1',
		target_version_id: 'v2',
	}
	const items = ref([
		item('ordinary'),
		item('update', { update }),
		item('warning', { environment: 'client_only' }),
		item('both', { update, pack_client_depends: true }),
		item('disabled', { enabled: false }),
	])
	const scope = effectScope()
	t.after(() => scope.stop())
	const pipeline = scope.run(() =>
		useContentPipeline({
			items,
			duplicateItems: ref([]),
			sortItems: (items) => items,
			getItemId: (item) => item.id,
			showUpdateFilter: true,
			showWarningsFilter: true,
		}),
	)!
	return {
		...pipeline,
		ids: () => pipeline.filteredItems.value.map((item) => item.id),
		async flush() {
			await nextTick()
			t.mock.timers.tick(100)
			await nextTick()
		},
	}
}

test('status filters update the visible list on every click without reloading items', async (t) => {
	const p = fixture(t)
	await p.flush()
	assert.equal(p.ids().length, 5)
	p.toggleStatusFilter('updates')
	await p.flush()
	assert.deepEqual(p.ids(), ['update', 'both'])
	p.toggleStatusFilter('warnings')
	await p.flush()
	assert.deepEqual(p.ids(), ['both'])
	p.toggleStatusFilter('updates')
	await p.flush()
	assert.deepEqual(p.ids(), ['warning', 'both'])
	p.toggleStatusFilter('warnings')
	await p.flush()
	assert.equal(p.ids().length, 5)
})

test('All clears status filters and restores the visible list without a refresh', async (t) => {
	const p = fixture(t)
	await p.flush()
	p.toggleStatusFilter('warnings')
	await p.flush()
	assert.deepEqual(p.ids(), ['warning', 'both'])
	p.selectedStatusFilters.value = []
	await p.flush()
	assert.equal(p.ids().length, 5)
})

test('enabled and disabled remain exclusive and can each be deselected', async (t) => {
	const p = fixture(t)
	await p.flush()
	p.toggleStatusFilter('enabled')
	await p.flush()
	assert.deepEqual(p.ids(), ['ordinary', 'update', 'warning', 'both'])
	p.toggleStatusFilter('enabled')
	await p.flush()
	assert.equal(p.ids().length, 5)
	p.toggleStatusFilter('enabled')
	p.toggleStatusFilter('disabled')
	await p.flush()
	assert.deepEqual(p.selectedStatusFilters.value, ['disabled'])
	assert.deepEqual(p.ids(), ['disabled'])
	p.toggleStatusFilter('disabled')
	await p.flush()
	assert.equal(p.ids().length, 5)
})
