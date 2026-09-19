;(() => {
	const isEditor =
		location.origin === 'http://axolotl-skin.localhost' ||
		(location.protocol === 'axolotl-skin:' && location.host === 'localhost') ||
		(location.origin === 'http://localhost:5201' &&
			location.pathname === '/__blockbench_skin__/index.html')
	if (
		!isEditor ||
		window.parent === window ||
		new URLSearchParams(location.search).get('embed') !== 'skin'
	)
		return

	function report(error) {
		window.parent.postMessage(
			{ type: 'axolotl-skin-load-error', error: String(error).slice(0, 1000) },
			'*',
		)
	}
	window.addEventListener('error', (event) => {
		if (event.message) {
			if (event.message.startsWith('ResizeObserver loop')) return
			report(event.message)
		}
	})
	window.addEventListener('unhandledrejection', (event) => {
		report(event.reason?.message || event.reason)
	})
	window.addEventListener('DOMContentLoaded', () => {
		window.blockbenchBundleReady?.catch((error) => report(error?.message || error))
	})
})()
