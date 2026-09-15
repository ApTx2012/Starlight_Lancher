export function createModalTransition() {
	let active = false
	let revision = 0
	function begin(next: boolean): (() => boolean) | undefined {
		if (active === next) return undefined
		active = next
		const current = ++revision
		return () => current === revision
	}
	return {
		begin,
		isActive: () => active,
		dispose: () => {
			active = false
			revision++
		},
	}
}
