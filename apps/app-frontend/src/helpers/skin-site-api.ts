import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
export const SKIN_SITE_ORIGIN = 'https://skin.starlight.cool'

/** Where the skin site stores the JWT for this launcher. Kept separate from
 * the web site's own `loginToken` so the two sessions never clash. */
const TOKEN_STORAGE_KEY = 'starlight-skin-site-token'

export type SkinSiteResponse<T> =
	| { readonly success: true; readonly payload: T; readonly timestamp: number }
	| {
			readonly success: false
			readonly timestamp: number
			readonly errorType?: string
			readonly errorCode: number
			readonly errorMessage: string
	  }

type RequestType = 'starlight' | 'skin' | 'mod'

const REQUEST_TYPE_PATH: Record<RequestType, string> = {
	starlight: '/starlight',
	skin: '/starlight/skin',
	mod: '/starlight/mod',
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export function getSkinSiteToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_STORAGE_KEY)
	} catch {
		return null
	}
}

export function setSkinSiteToken(token: string | null): void {
	try {
		if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
		else localStorage.removeItem(TOKEN_STORAGE_KEY)
	} catch {
		// Storage may be unavailable in some environments; ignore.
	}
}

export function clearSkinSiteToken(): void {
	setSkinSiteToken(null)
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

function createException(
	errorCode: number,
	errorMessage: string,
	timestamp?: number,
	errorType?: string,
): SkinSiteResponse<never> {
	return {
		success: false,
		timestamp: timestamp ?? Date.now(),
		errorMessage,
		errorType,
		errorCode,
	}
}

function handleException(status: number): SkinSiteResponse<never> {
	switch (status) {
		case 0:
			return createException(0, '连接中断，请检查网络或代理后重试', undefined, 'NetworkError')
		case 400:
			return createException(status, '请求参数有误')
		case 401:
			return createException(status, '该功能需要登录后才能使用')
		case 403:
			return createException(status, '权限不足')
		case 404:
			return createException(status, '资源不存在')
		case 413:
			return createException(status, '文件超过服务器上传大小限制')
		case 429:
			return createException(status, '请求过于频繁，请稍后再试')
		case 502:
		case 503:
			return createException(status, '服务器暂时不可用，请稍后重试')
		case 504:
			return createException(status, '网关等待服务器处理超时')
		default:
			return createException(status, `请求失败（HTTP ${status}）`)
	}
}

async function processResponse<T>(response: Response): Promise<SkinSiteResponse<T>> {
	const text = await response.text()

	if (!response.ok && text.length === 0) {
		return handleException(response.status)
	}

	let data: Record<string, unknown> | null = null
	try {
		data = text.length !== 0 ? JSON.parse(text) : null
	} catch {
		return response.ok
			? createException(response.status, '服务器返回了无法识别的响应', undefined, 'InvalidResponse')
			: handleException(response.status)
	}

	if (response.ok) {
		return {
			success: true,
			payload: data?.payload as T,
			timestamp: typeof data?.timestamp === 'number' ? data.timestamp : Date.now(),
		}
	}

	const errorMessage = data?.errorMessage
	if (typeof errorMessage === 'string' && errorMessage) {
		return createException(
			response.status,
			errorMessage,
			typeof data?.timestamp === 'number' ? data.timestamp : undefined,
			typeof data?.error === 'string' ? data.error : undefined,
		)
	}
	return handleException(response.status)
}

interface SendOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
	type?: RequestType
	body?: unknown
	/** Set to false to skip the Authorization header (e.g. login). */
	auth?: boolean
}

export async function skinSiteRequest<T>(
	path: string,
	options: SendOptions = {},
): Promise<SkinSiteResponse<T>> {
	const { method = 'GET', type = 'starlight', body, auth = true } = options
	const url = `${SKIN_SITE_ORIGIN}${REQUEST_TYPE_PATH[type]}/${path.replace(/^\/+/, '')}`

	const headers: Record<string, string> = {
		Accept: 'application/json',
	}
	if (body !== undefined) headers['Content-Type'] = 'application/json'
	if (auth) {
		const token = getSkinSiteToken()
		if (token) headers['Authorization'] = `Bearer ${token}`
	}

	let response: Response
	try {
		response = await tauriFetch(url, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		})
	} catch {
		return handleException(0)
	}

	return processResponse<T>(response)
}

// ---------------------------------------------------------------------------
// Auth types (mirrors the skin site's packet shapes)
// ---------------------------------------------------------------------------

export interface SkinSiteUser {
	uuid: string
	username: string
	email?: string
	qq?: number | null
	banned?: boolean
	id?: number
	permissions?: string[]
	registerTime?: number
	avatar?: string | null
}

export interface SkinSiteLoginResult {
	username: string
	jwt: string
}

export interface SkinSiteCaptchaRequire {
	clientId: string
	image?: string
	[extra: string]: unknown
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

/** Ask the server for a captcha challenge. */
export function requestCaptcha(): Promise<SkinSiteResponse<SkinSiteCaptchaRequire>> {
	return skinSiteRequest<SkinSiteCaptchaRequire>('captcha', { auth: false })
}

/** Submit the captcha rotation angle; resolves to the clientId used for login/register. */
export function verifyCaptcha(payload: {
	clientId: string
	degree: number
}): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('verifyCaptcha', { method: 'POST', body: payload, auth: false })
}

export function skinSiteLogin(payload: {
	username: string
	password: string
	clientId: string
}): Promise<SkinSiteResponse<SkinSiteLoginResult>> {
	return skinSiteRequest<SkinSiteLoginResult>('login', {
		method: 'POST',
		body: payload,
		auth: false,
	})
}

export function skinSiteRefresh(): Promise<SkinSiteResponse<SkinSiteLoginResult>> {
	return skinSiteRequest<SkinSiteLoginResult>('user/refresh')
}

export function skinSiteCurrentUser(): Promise<SkinSiteResponse<SkinSiteUser>> {
	return skinSiteRequest<SkinSiteUser>('user')
}

export function skinSiteLuck(): Promise<SkinSiteResponse<{ luck: number }>> {
	return skinSiteRequest<{ luck: number }>('luck')
}

export function skinSiteRegisterCondition(): Promise<
	SkinSiteResponse<{ registerAllowed: boolean; inviteCodeRequired: boolean }>
> {
	return skinSiteRequest('register/condition', { auth: false })
}
// ---------------------------------------------------------------------------
// Players & skins (RequestType.SKIN)
// ---------------------------------------------------------------------------

export interface SkinSitePlayerInfo {
	uuid: string
	name: string
	isMojang: boolean
	ownerUsername?: string
	legacyInternalAdapted?: boolean
}

export interface SkinSitePlayerSkin {
	skin?: string
	cape?: string
	elytra?: string
	model?: 'default' | 'slim'
}

/** List the players owned by the signed-in account. */
export function skinSitePlayerList(): Promise<SkinSiteResponse<SkinSitePlayerInfo[]>> {
	return skinSiteRequest<SkinSitePlayerInfo[]>('player', { type: 'skin' })
}

/** Fetch the skin/cape/elytra textures for a single player. */
export function skinSitePlayerSkin(uuid: string): Promise<SkinSiteResponse<SkinSitePlayerSkin>> {
	return skinSiteRequest<SkinSitePlayerSkin>(`player/skin/${encodeURIComponent(uuid)}`, {
		type: 'skin',
	})
}

export type SkinTextureType = 'SKIN' | 'CAPE' | 'ELYTRA'

/** Upload (or replace) a texture for a player. */
export async function skinSiteUploadTexture(
	uuid: string,
	file: File,
	type: SkinTextureType,
	metadata: Record<string, string> = {},
): Promise<SkinSiteResponse<string>> {
	const form = new FormData()
	form.append('file', file)
	for (const [key, value] of Object.entries(metadata)) form.append(key, value)

	const url = `${SKIN_SITE_ORIGIN}/starlight/skin/player/skin/${encodeURIComponent(uuid)}/${type}`
	const headers: Record<string, string> = {}
	const token = getSkinSiteToken()
	if (token) headers['Authorization'] = `Bearer ${token}`

	let response: Response
	try {
		response = await tauriFetch(url, { method: 'PUT', headers, body: form })
	} catch {
		return handleException(0)
	}
	return processResponse<string>(response)
}

/** Remove a texture from a player. */
export function skinSiteDeleteTexture(
	uuid: string,
	type: SkinTextureType,
): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>(`player/skin/${encodeURIComponent(uuid)}/${type}`, {
		method: 'DELETE',
		type: 'skin',
	})
}

/** Add a player by name to the signed-in account. */
export function skinSiteAddPlayer(playerName: string): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>(`player/add/${encodeURIComponent(playerName)}`, {
		method: 'POST',
		type: 'skin',
	})
}

export function skinSiteDeletePlayer(uuid: string): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>(`player/${encodeURIComponent(uuid)}`, {
		method: 'DELETE',
		type: 'skin',
	})
}

export function skinSiteRenamePlayer(
	uuid: string,
	newName: string,
): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>(
		`player/${encodeURIComponent(uuid)}/rename/${encodeURIComponent(newName)}`,
		{ method: 'POST', type: 'skin' },
	)
}
// ---------------------------------------------------------------------------
// Registration & password reset
// ---------------------------------------------------------------------------

/** Send the email verification code used during registration. */
export function skinSiteRegisterEmailVerify(email: string): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('register/emailVerify', {
		method: 'POST',
		body: { email },
		auth: false,
	})
}

export function skinSiteRegister(payload: {
	qq?: number
	email: string
	emailVerifyCode: string
	password: string
	inviteCode?: string
	clientId: string
}): Promise<SkinSiteResponse<SkinSiteLoginResult>> {
	return skinSiteRequest<SkinSiteLoginResult>('register', {
		method: 'POST',
		body: payload,
		auth: false,
	})
}

/** Ask the server to email a reset code. Always answers success to avoid probing. */
export function skinSitePasswordResetEmailVerify(email: string): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('password/emailVerify', {
		method: 'POST',
		body: { email },
		auth: false,
	})
}

export function skinSitePasswordReset(payload: {
	clientId: string
	email: string
	emailVerifyCode: string
	newPassword: string
}): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('password/reset', {
		method: 'POST',
		body: payload,
		auth: false,
	})
}
// ---------------------------------------------------------------------------
// Donations & announcements
// ---------------------------------------------------------------------------

export interface SkinSiteDonationSummary {
	totalAmount: string
	donorCount: number
}

export interface SkinSiteDonationEntry {
	id: number
	rank: number
	username: string
	avatar: string | null
	amount: string
}

export interface SkinSiteDonationPage {
	items: SkinSiteDonationEntry[]
	summary: SkinSiteDonationSummary
	hasMore: boolean
}

export function skinSiteDonationSummary(): Promise<SkinSiteResponse<SkinSiteDonationSummary>> {
	return skinSiteRequest<SkinSiteDonationSummary>('donation/summary', { auth: false })
}

export function skinSiteDonationList(offset = 0): Promise<SkinSiteResponse<SkinSiteDonationPage>> {
	return skinSiteRequest<SkinSiteDonationPage>(`donation/list?limit=20&offset=${offset}`, {
		auth: false,
	})
}

export interface SkinSiteAnnouncement {
	id: number
	title: string
	subtitle: string
	imageName?: string
	content: string
	updateAt: number
	star: boolean
	importantLevel: number
	source: string
}

/** Public announcements shown on the skin site. Requires the JWT when signed in. */
export function skinSiteAnnouncements(): Promise<SkinSiteResponse<SkinSiteAnnouncement[]>> {
	return skinSiteRequest<SkinSiteAnnouncement[]>('broadcast/all', { type: 'skin' })
}
// ---------------------------------------------------------------------------
// Account updates (requires the JWT)
// ---------------------------------------------------------------------------

export function skinSiteChangeUsername(newUsername: string): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('update/username', {
		method: 'POST',
		body: { newUsername },
	})
}

export function skinSiteChangePassword(
	oldPassword: string,
	newPassword: string,
): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('update/password', {
		method: 'POST',
		body: { oldPassword, newPassword },
	})
}

/** Pass null to reset the Minecraft password back to the website password. */
export function skinSiteChangeYggdrasilPassword(
	newPassword: string | null,
): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('update/yggdrasilPassword', {
		method: 'POST',
		body: { newPassword },
	})
}

/** Upload a new avatar image (multipart). */
export async function skinSiteUploadAvatar(blob: Blob): Promise<SkinSiteResponse<string>> {
	const form = new FormData()
	form.append('avatar', blob)

	const url = `${SKIN_SITE_ORIGIN}/starlight/update/avatar`
	const headers: Record<string, string> = {}
	const token = getSkinSiteToken()
	if (token) headers['Authorization'] = `Bearer ${token}`

	let response: Response
	try {
		response = await tauriFetch(url, { method: 'POST', headers, body: form })
	} catch {
		return handleException(0)
	}
	return processResponse<string>(response)
}
// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export type SkinSiteDownloadStatus = 'OK' | 'NEW' | 'LEGACY' | 'OUTDATED' | 'REMOVAL'

export interface SkinSiteDownloadRoute {
	name?: string | null
	url: string
}

export interface SkinSiteDownloadItem {
	id: number
	uploader: string
	url: string
	routes: SkinSiteDownloadRoute[]
	filename: string
	description: string
	status: SkinSiteDownloadStatus[]
	category: string[]
}

export interface SkinSiteDownloadCategory {
	id: number
	name: string
}

export function skinSiteDownloadList(options?: {
	limit?: number
	offset?: number
	category?: string
}): Promise<SkinSiteResponse<SkinSiteDownloadItem[]>> {
	const query = new URLSearchParams({
		limit: String(options?.limit ?? 200),
		offset: String(options?.offset ?? 0),
	})
	if (options?.category) query.set('category', options.category)
	return skinSiteRequest<SkinSiteDownloadItem[]>(`download/list?${query.toString()}`, {
		auth: false,
	})
}

export function skinSiteDownloadCount(category?: string): Promise<SkinSiteResponse<number>> {
	const suffix = category ? `?category=${encodeURIComponent(category)}` : ''
	return skinSiteRequest<number>(`download/count${suffix}`, { auth: false })
}

export function skinSiteDownloadCategories(): Promise<
	SkinSiteResponse<SkinSiteDownloadCategory[]>
> {
	return skinSiteRequest<SkinSiteDownloadCategory[]>('download/category/list', { auth: false })
}
// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

export interface SkinSiteMapEntry {
	name: string
	url: string
}

export interface SkinSiteMapServer {
	name: string
	internal: boolean
	maps: SkinSiteMapEntry[]
}

export function skinSiteMapServers(): Promise<SkinSiteResponse<SkinSiteMapServer[]>> {
	return skinSiteRequest<SkinSiteMapServer[]>('maps', { auth: false })
}
// ---------------------------------------------------------------------------
// Player review (public side)
// ---------------------------------------------------------------------------

export type SkinSiteReviewQuestionType = 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL' | 'ESSAY'
export type SkinSiteReviewResult = 'PENDING' | 'PASSED' | 'REJECTED'

export interface SkinSiteReviewOption {
	id: string
	description: string
	correct?: boolean
	defaultSelected?: boolean
}

export interface SkinSiteReviewQuestion {
	id: string
	type: SkinSiteReviewQuestionType
	title: string
	annotation?: string | null
	score?: number
	optional?: boolean
	fatal?: boolean
	options?: SkinSiteReviewOption[]
	answer?: string | null
	maxLength?: number | null
	informationQuestion?: boolean
}

export interface SkinSiteReviewPaper {
	id: string
	title: string
	description?: string
	questions: SkinSiteReviewQuestion[]
	[key: string]: unknown
}

export interface SkinSiteReviewCatalog {
	papers: SkinSiteReviewPaper[]
	[key: string]: unknown
}

export interface SkinSiteReviewReceipt {
	id?: number
	accessToken?: string
	result?: SkinSiteReviewResult
	title?: string
	[key: string]: unknown
}

export function skinSiteReviewCatalog(): Promise<SkinSiteResponse<SkinSiteReviewCatalog>> {
	return skinSiteRequest<SkinSiteReviewCatalog>('review/public', { auth: false })
}

export function skinSiteReviewPaper(
	paperId: string,
): Promise<SkinSiteResponse<SkinSiteReviewPaper>> {
	return skinSiteRequest<SkinSiteReviewPaper>(`review/public/${encodeURIComponent(paperId)}`, {
		auth: false,
	})
}

export interface SkinSiteReviewSubmitData {
	paperId: string
	email: string
	answers: Record<string, unknown>
	inviteCode?: string
	[key: string]: unknown
}

export function skinSiteSubmitReview(
	data: SkinSiteReviewSubmitData,
): Promise<SkinSiteResponse<SkinSiteReviewReceipt>> {
	return skinSiteRequest<SkinSiteReviewReceipt>('review/submit', {
		method: 'POST',
		body: data,
		auth: false,
	})
}
// ---------------------------------------------------------------------------
// Bug tracker
// ---------------------------------------------------------------------------

export type SkinSiteBugIssueType = 'BUG' | 'FEATURE' | 'IMPROVEMENT'
export type SkinSiteBugStatus =
	| 'PENDING'
	| 'CONFIRMED'
	| 'NEEDS_INFO'
	| 'IN_PROGRESS'
	| 'VERIFYING'
	| 'CLOSED'
export type SkinSiteBugPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'
export type SkinSiteBugSearchType = 'CONTENT' | 'SUBMITTER'
export type SkinSiteBugResolution =
	| 'FIXED'
	| 'WONT_FIX'
	| 'BY_DESIGN'
	| 'DUPLICATE'
	| 'CANNOT_REPRODUCE'
	| 'INVALID'

export interface SkinSiteBugImage {
	hash: string
	[key: string]: unknown
}

export interface SkinSiteBugIssue {
	id: number
	type: SkinSiteBugIssueType
	title: string
	description: string
	private: boolean
	authorUuid: string
	authorName: string
	authorAvatar: string | null
	status: SkinSiteBugStatus
	priority: SkinSiteBugPriority
	resolution: SkinSiteBugResolution | null
	assigneeUuid: string | null
	assigneeName: string | null
	commentCount: number
	images: SkinSiteBugImage[]
	createdAt: number
	updatedAt: number
	closedAt: number | null
	canEdit: boolean
	canManage: boolean
}

export interface SkinSiteBugIssuePage {
	items: SkinSiteBugIssue[]
	hasMore: boolean
}

export function skinSiteBugIssues(params: {
	offset?: number
	limit?: number
	type?: SkinSiteBugIssueType | ''
	status?: SkinSiteBugStatus | ''
	priority?: SkinSiteBugPriority | ''
	assigned?: boolean
	openOnly?: boolean
	pendingFirst?: boolean
	searchType?: SkinSiteBugSearchType
	keyword?: string
}): Promise<SkinSiteResponse<SkinSiteBugIssuePage>> {
	const query = new URLSearchParams({
		offset: String(params.offset ?? 0),
		limit: String(params.limit ?? 20),
	})
	if (params.type) query.set('type', params.type)
	if (params.status) query.set('status', params.status)
	if (params.priority) query.set('priority', params.priority)
	if (params.assigned) query.set('assigned', 'true')
	if (params.searchType && params.keyword) {
		query.set('searchType', params.searchType)
		query.set('keyword', params.keyword)
	}
	query.set('openOnly', String(params.openOnly ?? true))
	query.set('pendingFirst', String(params.pendingFirst ?? true))
	return skinSiteRequest<SkinSiteBugIssuePage>(`bug?${query.toString()}`)
}

export function skinSiteBugIssue(id: number): Promise<SkinSiteResponse<SkinSiteBugIssue>> {
	return skinSiteRequest<SkinSiteBugIssue>(`bug/${id}`)
}

export interface SkinSiteBugComment {
	id: number
	issueId: number
	authorUuid: string
	authorName: string
	authorAvatar: string | null
	content: string
	system: boolean
	images: SkinSiteBugImage[]
	createdAt: number
	editedAt: number | null
	deletedAt: number | null
	canEdit: boolean
	canDelete: boolean
}

export interface SkinSiteBugCommentPage {
	items: SkinSiteBugComment[]
	hasMore: boolean
}

export function skinSiteBugComments(
	issueId: number,
	offset = 0,
	limit = 50,
): Promise<SkinSiteResponse<SkinSiteBugCommentPage>> {
	return skinSiteRequest<SkinSiteBugCommentPage>(
		`bug/${issueId}/comments?offset=${offset}&limit=${limit}`,
	)
}

export function skinSiteCreateBugComment(
	issueId: number,
	content: string,
): Promise<SkinSiteResponse<SkinSiteBugComment>> {
	return skinSiteRequest<SkinSiteBugComment>(`bug/${issueId}/comments`, {
		method: 'POST',
		body: { content },
	})
}

export function skinSiteDeleteBugComment(id: number): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>(`bug/comments/${id}`, { method: 'DELETE' })
}

export function skinSiteBugUnreadCount(): Promise<SkinSiteResponse<number>> {
	return skinSiteRequest<number>('bug/notifications/count')
}

export function skinSiteMarkBugNotificationsRead(): Promise<SkinSiteResponse<string>> {
	return skinSiteRequest<string>('bug/notifications/read', { method: 'POST' })
}
