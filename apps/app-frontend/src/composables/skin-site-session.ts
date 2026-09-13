import { readonly, ref } from 'vue'

export const SKIN_SITE_ORIGIN = 'https://skin.starlight.cool'
export type SkinSiteUser = { uuid: string; username: string }
export type SkinSiteStatus = 'checking' | 'signed-out' | 'signed-in' | 'error'

const user = ref<SkinSiteUser | null>(null)
const status = ref<SkinSiteStatus>('signed-out')
const frameUrl = ref(`${SKIN_SITE_ORIGIN}/`)

export const skinSiteUser = readonly(user)
export const skinSiteStatus = readonly(status)
export const skinSiteFrameUrl = readonly(frameUrl)

export function openSkinSiteLogin() {
	frameUrl.value = `${SKIN_SITE_ORIGIN}/login`
}

export function resetSkinSiteSession() {
	user.value = null
	status.value = 'signed-out'
}

export function receiveSkinSiteSession(event: MessageEvent, frame: Window | null) {
	if (!frame || event.source !== frame || event.origin !== SKIN_SITE_ORIGIN) return false
	const data = event.data
	if (!data || data.type !== 'starlight-skin-session') return false
	if (!['checking', 'signed-out', 'signed-in', 'error'].includes(data.status)) return false
	if (data.status === 'signed-in') {
		if (
			!data.user ||
			typeof data.user.uuid !== 'string' ||
			typeof data.user.username !== 'string' ||
			!data.user.uuid ||
			!data.user.username ||
			data.user.username.length > 256
		)
			return false
		user.value = { uuid: data.user.uuid, username: data.user.username }
		if ([`${SKIN_SITE_ORIGIN}/`, `${SKIN_SITE_ORIGIN}/login`].includes(frameUrl.value)) {
			frameUrl.value = `${SKIN_SITE_ORIGIN}/profile`
		}
	} else {
		user.value = null
	}
	status.value = data.status
	return true
}
