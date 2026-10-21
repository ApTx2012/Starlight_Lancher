import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, registerHooks, stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

import { createRenderer, h, nextTick, Suspense } from 'vue'

import { useNetworkStatus } from '../../composables/useNetworkStatus.ts'

// Exercise the real component's setup and reactive account list. Only platform,
// navigation, and visual dependencies are replaced; auth/session logic stays real.
const require = createRequire(import.meta.url)
const { parse, compileScript } = require('vue/compiler-sfc')
const componentUrl = new URL('./AccountsCard.vue', import.meta.url).href
const stubs: Record<string, string> = {
	'@tauri-apps/plugin-http': `export const fetch=(...args)=>globalThis.accountTestFetch(...args)`,
	'@modrinth/assets': `export const CopyIcon={}, LogInIcon={}, PlusIcon={}, RadioButtonCheckedIcon={}, RadioButtonIcon={}, RefreshCwIcon={}, SpinnerIcon={}, TrashIcon={}`,
	'@modrinth/ui': `export const Accordion={}, Avatar={}, ButtonStyled={}; export const defineMessages=x=>x; export const injectNotificationManager=()=>({handleError:()=>{}}); export const useVIntl=()=>({formatMessage:x=>x.defaultMessage})`,
	'@tanstack/vue-query': `export const useQueryClient=()=>({refetchQueries:async()=>{}})`,
	'@tauri-apps/api/event': `export const listen=async()=>()=>{}`,
	'vue-router': `export const useRoute=()=>({fullPath:'/'}); export const useRouter=()=>({push:async()=>{}})`,
	'@/assets/netherstar.png': `export default 'logo'`,
	'@/components/ui/MinecraftLoginModal.vue': `export default {}`,
	'@/components/ui/skin-site/SkinSiteLoginModal.vue': `export default {}`,
	'@/helpers/events': `export const process_listener=async()=>()=>{}`,
	'@/helpers/rendering/batch-skin-renderer.ts': `export const getPlayerHeadUrl=async()=> 'head'`,
	'@/helpers/skins': `export const get_available_skins=async()=>[]`,
	'@/store/error.js': `export const handleSevereError=()=>{}`,
	'@/store/state': `export const useTheming=()=>({homeLayout:'standard'})`,
}
const hooks = registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier in stubs) {
			return {
				url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`,
				shortCircuit: true,
			}
		}
		if (specifier.startsWith('@/')) {
			const file = new URL(`../../${specifier.slice(2)}`, import.meta.url)
			if (!/\.(ts|js)$/.test(file.pathname))
				file.pathname += specifier === '@/helpers/auth' ? '.js' : '.ts'
			return nextResolve(file.href, context)
		}
		return nextResolve(specifier, context)
	},
	load(url, context, nextLoad) {
		if (url !== componentUrl) return nextLoad(url, context)
		const { descriptor } = parse(readFileSync(new URL(url), 'utf8'))
		return {
			format: 'module',
			source: stripTypeScriptTypes(compileScript(descriptor, { id: 'accounts-card-test' }).content),
			shortCircuit: true,
		}
	},
})
const { default: AccountsCard } = await import(componentUrl)
const {
	resetSkinSiteSession,
	signInSkinSite,
	signOutSkinSite,
	selectedSkinSitePlayerId,
	SKIN_SITE_ORIGIN,
} = await import('../../composables/skin-site-session.ts')
hooks.deregister()

type TestNode = Record<string, unknown>
type TestAccount = {
	account_type: 'microsoft' | 'yggdrasil'
	profile: { id: string; name: string }
	yggdrasil?: { api_root: string; server_name: string; login: string }
}
type CardState = {
	accounts: TestAccount[]
	defaultUser: string | undefined
	selectedAccount: TestAccount | undefined
	setAccount: (account: TestAccount) => Promise<void>
	setSkinSitePlayer: (id: string) => Promise<void>
	getAccountAvatarUrl: (account: TestAccount) => string | undefined
}
const renderer = createRenderer<TestNode, TestNode>({
	createElement: () => ({}),
	createText: () => ({}),
	createComment: () => ({}),
	insert() {},
	remove() {},
	setText() {},
	setElementText() {},
	patchProp() {},
	parentNode: () => null,
	nextSibling: () => null,
})
const flush = async () => {
	await new Promise((resolve) => setImmediate(resolve))
	await nextTick()
}
const firstId = '12345678-1234-1234-1234-123456789abc'
const secondId = '22345678-1234-1234-1234-123456789abc'

async function fixture(hasOfficial = true, officialId = 'official', linkedMojang = false) {
	const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
	const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
	const stored: TestAccount[] = hasOfficial
		? [{ account_type: 'microsoft', profile: { id: officialId, name: 'Official' } }]
		: []
	let selected: string | undefined = hasOfficial ? officialId : undefined
	let rejectLogin = false
	let loginCalls = 0
	const storage = new Map<string, string>()
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		},
	})
	;(
		globalThis as unknown as { accountTestFetch: (url: string) => Promise<Response> }
	).accountTestFetch = async (url) => {
		const path = new URL(url).pathname
		const payload = path.endsWith('/login')
			? { username: 'Owner', jwt: 'fixture.jwt' }
			: path.endsWith('/user')
				? { uuid: 'owner', username: 'Owner', permissions: [] }
				: path.endsWith('/player')
					? [
							{ uuid: firstId, name: 'First', isMojang: linkedMojang || firstId === officialId },
							{ uuid: secondId, name: 'Second', isMojang: false },
						]
					: {}
		return Response.json({ payload })
	}
	Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
	useNetworkStatus().refreshBrowserOffline()
	Object.defineProperty(globalThis, 'window', {
		configurable: true,
		value: {
			__TAURI_INTERNALS__: {
				async invoke(command: string, args: Record<string, unknown>) {
					if (command === 'plugin:auth|get_default_user') return selected
					if (command === 'plugin:auth|get_users') return stored
					if (command === 'plugin:auth|login_skin_site_player') {
						loginCalls++
						assert.equal(args.userId, 'owner')
						assert.equal(args.token, 'fixture.jwt')
						assert.ok(typeof args.playerId === 'string')
						if (rejectLogin) throw new Error('Login failed')
						stored.push({
							profile: { id: args.playerId, name: args.playerId === firstId ? 'First' : 'Second' },
							account_type: 'yggdrasil',
							yggdrasil: {
								api_root: `${SKIN_SITE_ORIGIN}/yggdrasil`,
								server_name: 'StarLight',
								login: 'owner',
							},
						})
						return stored[stored.length - 1]
					}
					if (command === 'plugin:auth|set_default_user') {
						assert.ok(typeof args.user === 'string')
						assert.ok(stored.some((account) => account.profile.id === args.user))
						selected = args.user
						return
					}
					throw new Error(`Unexpected command: ${command}`)
				},
			},
		},
	})
	resetSkinSiteSession()
	const node = h({ ...AccountsCard, render: () => null })
	const app = renderer.createApp({ render: () => h(Suspense, null, { default: () => node }) })
	app.mount({})
	await flush()
	return {
		state: (node.component! as unknown as { setupState: CardState }).setupState,
		async login() {
			await signInSkinSite({ username: 'Owner', password: 'password', clientId: 'test' })
			await flush()
		},
		signOut() {
			signOutSkinSite()
		},
		failLogin(value: boolean) {
			rejectLogin = value
		},
		get selected() {
			return selected
		},
		get loginCalls() {
			return loginCalls
		},
		close() {
			app.unmount()
			resetSkinSiteSession()
			Reflect.deleteProperty(globalThis, 'localStorage')
			if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
			else Reflect.deleteProperty(globalThis, 'window')
			if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
			else Reflect.deleteProperty(globalThis, 'navigator')
		},
	}
}

test('sidebar offers every skin-site player before any game authentication or launch', async () => {
	const view = await fixture(false)
	try {
		view.failLogin(true)
		await view.login()
		await flush()
		assert.deepEqual(
			view.state.accounts.map((account) => account.profile.id),
			[firstId, secondId],
		)
		assert.equal(view.loginCalls, 0)
		assert.equal(view.selected, undefined)
	} finally {
		view.close()
	}
})

test('choosing an unused skin-site player authenticates and persists the default without a launch', async () => {
	const view = await fixture()
	try {
		await view.login()
		await flush()
		await view.state.setAccount(
			view.state.accounts.find((account) => account.profile.id === secondId)!,
		)
		assert.equal(view.selected, secondId)
		assert.equal(view.state.selectedAccount?.profile.id, secondId)
		assert.equal(view.state.accounts.length, 3)
		assert.equal(view.loginCalls, 1)
	} finally {
		view.close()
	}
})

test('failed player authentication preserves the default and allows retry', async () => {
	const view = await fixture()
	try {
		await view.login()
		await flush()
		view.failLogin(true)
		await view.state.setAccount(
			view.state.accounts.find((account) => account.profile.id === secondId)!,
		)
		assert.equal(view.selected, 'official')
		assert.equal(view.state.defaultUser, 'official')
		view.failLogin(false)
		await view.state.setAccount(
			view.state.accounts.find((account) => account.profile.id === secondId)!,
		)
		assert.equal(view.selected, secondId)
	} finally {
		view.close()
	}
})

test('signing out removes unregistered choices while keeping saved accounts', async () => {
	const view = await fixture()
	try {
		await view.login()
		await flush()
		await view.state.setAccount(
			view.state.accounts.find((account) => account.profile.id === firstId)!,
		)
		view.signOut()
		await flush()
		assert.deepEqual(
			view.state.accounts.map((account) => account.profile.id),
			[firstId, 'official'],
		)
		assert.equal(view.selected, firstId)
		await view.login()
		await flush()
		assert.equal(view.state.accounts.length, 3)
		assert.equal(view.loginCalls, 1)
	} finally {
		view.close()
	}
})

test('a new player without a skin can render the shared empty avatar', async () => {
	const view = await fixture(false)
	try {
		await view.login()
		await flush()
		assert.equal(view.state.getAccountAvatarUrl(view.state.accounts[0]), undefined)
	} finally {
		view.close()
	}
})

test('choosing a player from the home avatar rail switches the persisted account and shared skin selection', async () => {
	const view = await fixture()
	try {
		await view.login()
		await view.state.setSkinSitePlayer(secondId)
		assert.equal(view.selected, secondId)
		assert.equal(view.state.selectedAccount?.profile.id, secondId)
		assert.equal(selectedSkinSitePlayerId.value, secondId)
		await view.state.setAccount(
			view.state.accounts.find((account) => account.profile.id === 'official')!,
		)
		assert.equal(view.selected, 'official')
		assert.equal(selectedSkinSitePlayerId.value, null)
	} finally {
		view.close()
	}
})

test('failed home player selection keeps the current skin selection as well as the account', async () => {
	const view = await fixture()
	try {
		await view.login()
		await view.state.setSkinSitePlayer(firstId)
		view.failLogin(true)
		await view.state.setSkinSitePlayer(secondId)
		assert.equal(view.selected, firstId)
		assert.equal(selectedSkinSitePlayerId.value, firstId)
	} finally {
		view.close()
	}
})

test('a Microsoft player linked on the skin site keeps official skin and cape management', async () => {
	const view = await fixture(true, firstId)
	try {
		await view.login()
		assert.equal(selectedSkinSitePlayerId.value, null)
		await view.state.setSkinSitePlayer(secondId)
		await view.state.setAccount(
			view.state.accounts.find((account) => account.profile.id === firstId)!,
		)
		assert.equal(view.selected, firstId)
		assert.equal(selectedSkinSitePlayerId.value, null)
	} finally {
		view.close()
	}
})

test('site players linked to Mojang remain selectable without a saved Microsoft credential', async () => {
	const view = await fixture(false, 'official', true)
	try {
		await view.login()
		assert.equal(view.state.accounts.length, 2)
		await view.state.setSkinSitePlayer(firstId)
		assert.equal(view.selected, firstId)
		assert.equal(selectedSkinSitePlayerId.value, firstId)
	} finally {
		view.close()
	}
})
