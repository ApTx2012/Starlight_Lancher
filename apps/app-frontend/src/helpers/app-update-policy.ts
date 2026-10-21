export function shouldDelayAppUpdate(
	update: { publishedAt?: string; forceUpdate?: boolean; rollback?: boolean },
	channel: string,
	immediateUpdateFetch: boolean,
	now = Date.now(),
): boolean {
	if (channel !== 'release' || immediateUpdateFetch || update.forceUpdate || update.rollback)
		return false
	const publishedAt = Date.parse(update.publishedAt ?? '')
	return !Number.isFinite(publishedAt) || now < publishedAt + 24 * 60 * 60 * 1000
}
