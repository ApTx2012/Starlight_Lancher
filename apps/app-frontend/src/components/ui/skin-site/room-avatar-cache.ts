import { skinSiteChatRoomAvatarFetch } from '@/helpers/skin-site-api'

const avatarUrls = new Map<number, string>()
const pending = new Map<number, Promise<string | null>>()

export function loadCachedRoomAvatar(
	roomId: number,
	attachmentId: number,
): Promise<string | null> {
	const cached = avatarUrls.get(attachmentId)
	if (cached) return Promise.resolve(cached)
	const running = pending.get(attachmentId)
	if (running) return running

	const request = skinSiteChatRoomAvatarFetch(roomId).then((blob) => {
		pending.delete(attachmentId)
		if (!blob) return null
		const url = URL.createObjectURL(blob)
		avatarUrls.set(attachmentId, url)
		return url
	})
	pending.set(attachmentId, request)
	return request
}

export function forgetRoomAvatar(attachmentId: number) {
	const url = avatarUrls.get(attachmentId)
	if (url) URL.revokeObjectURL(url)
	avatarUrls.delete(attachmentId)
}
