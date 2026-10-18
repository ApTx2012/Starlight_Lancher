export function safeWikiColor(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const color = value.trim()
	return color.length <= 80 &&
		/^(?:[a-z]{1,20}|#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8}|rgba?\([\d\s.,%]+\))$/i.test(color)
		? color
		: null
}

export function safeExternalUrl(url?: string | null): string {
	if (!url) return '#'
	try {
		const parsed = new URL(url)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : '#'
	} catch {
		return '#'
	}
}
