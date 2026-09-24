import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, registerHooks, stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

import { createRenderer, h, nextTick, Suspense } from 'vue'

import {
	receiveSkinSiteMessage,
	resetSkinSiteSession,
	setSkinSiteFrame,
	SKIN_SITE_ORIGIN,
} from '../../composables/skin-site-session.ts'
import { useNetworkStatus } from '../../composables/useNetworkStatus.ts'

// Exercise the real component's setup and reactive account list. Only platform,
// navigation, and visual dependencies are replaced; auth/session logic stays real.
const require = createRequire(import.meta.url)
const { parse, compileScript } = require('vue/compiler-sfc')
const componentUrl = new URL('./AccountsCard.vue', import.meta.url).href
const stubs: Record<string, string> = {
	'@modrinth/assets': `export const CopyIcon={}, LogInIcon={}, PlusIcon={}, RadioButtonCheckedIcon={}, RadioButtonIcon={}, RefreshCwIcon={}, SpinnerIcon={}, TrashIcon={}`,
	'@modrinth/ui': `export const Accordion={}, Avatar={}, ButtonStyled={}; export const defineMessages=x=>x; export const injectNotificationManager=()=>({handleError:()=>{}}); export const useVIntl=()=>({formatMessage:x=>x.defaultMessage})`,
	'@tanstack/vue-query': `export const useQueryClient=()=>({refetchQueries:async()=>{}})`,
	'@tauri-apps/api/event': `export const listen=async()=>()=>{}`,
	'vue-router': `export const useRoute=()=>({fullPath:'/'}); export const useRouter=()=>({push:async()=>{}})`,
	'@/assets/netherstar.png': `export default 'logo'`,
	'@/components/ui/MinecraftLoginModal.vue': `export default {}`,
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

async function fixture(hasOfficial = true) {
	const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
	const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
	const stored: TestAccount[] = hasOfficial
		? [{ account_type: 'microsoft', profile: { id: 'official', name: 'Official' } }]
		: []
	let selected: string | undefined = hasOfficial ? 'official' : undefined
	let rejectLogin = false
	let loginCalls = 0
	const frame = {
		postMessage(data: { type: string; requestId: string }) {
			if (data.type === 'starlight-pack-token-request')
				message({
					type: 'starlight-pack-token-result',
					requestId: data.requestId,
					token: 'fixture.jwt',
				})
			if (data.type === 'starlight-skin-players-request')
				message({
					type: 'starlight-skin-players-result',
					requestId: data.requestId,
					ok: true,
					players: [
						{ uuid: firstId, name: 'First', isMojang: false, skinState: 'empty' },
						{ uuid: secondId, name: 'Second', isMojang: false, skinState: 'empty' },
					],
				})
		},
	} as unknown as Window
	function message(data: unknown) {
		receiveSkinSiteMessage({ origin: SKIN_SITE_ORIGIN, source: frame, data } as MessageEvent, frame)
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
	setSkinSiteFrame(frame)
	const node = h({ ...AccountsCard, render: () => null })
	const app = renderer.createApp({ render: () => h(Suspense, null, { default: () => node }) })
	app.mount({})
	await flush()
	return {
		state: (node.component! as unknown as { setupState: CardState }).setupState,
		login() {
			message({
				type: 'starlight-skin-session',
				status: 'signed-in',
				user: { uuid: 'owner', username: 'Owner' },
			})
		},
		signOut() {
			message({ type: 'starlight-skin-session', status: 'signed-out' })
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
			setSkinSiteFrame(null)
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
		view.login()
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
		view.login()
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
		view.login()
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
		view.login()
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
		view.login()
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
		view.login()
		await flush()
		assert.equal(view.state.getAccountAvatarUrl(view.state.accounts[0]), undefined)
	} finally {
		view.close()
	}
})
