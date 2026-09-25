interface LogCursor {
	cursor: number
	output: string
	new_file: boolean
}

/** One authoritative stream: use process events until latest.log becomes available. */
export function createLatestLogReader(
	read: (cursor: number) => Promise<LogCursor>,
	append: (output: string, replace: boolean) => void,
) {
	let cursor = 0
	let active = false
	let session = 0
	let cleared = 0
	let partialLine = ''
	let replaceOnAppend = false
	let pending: Promise<void> | null = null

	function refresh(): Promise<void> {
		if (pending) return pending
		const requestSession = session
		const requestClear = cleared
		const request = (async () => {
			const result = await read(cursor)
			if (requestSession !== session) return
			const rotated = result.new_file || result.cursor < cursor
			const replace = !active || rotated
			cursor = result.cursor
			if (result.cursor === 0 && !result.output) {
				if (rotated) {
					active = false
					partialLine = ''
					replaceOnAppend = false
					if (requestClear === cleared) append('', true)
				}
				return
			}
			active = true
			// Clearing during a read consumes its bytes without restoring cleared text.
			if (requestClear === cleared && (result.output || result.new_file)) {
				if (replace) {
					partialLine = ''
					replaceOnAppend = true
				}
				partialLine += result.output
				// File writes can end mid-line. Do not turn the next chunk into a
				// separate log entry; bound unterminated output just like the console.
				const end =
					partialLine.length > 64 * 1024 ? partialLine.length : partialLine.lastIndexOf('\n') + 1
				if (end > 0) {
					append(partialLine.slice(0, end), replaceOnAppend)
					partialLine = partialLine.slice(end)
					replaceOnAppend = false
				}
			}
		})()
		pending = request
		return request.finally(() => {
			if (pending === request) pending = null
		})
	}

	return {
		refresh,
		get active() {
			return active
		},
		clear() {
			cleared++
			partialLine = ''
			replaceOnAppend = false
		},
		flush() {
			if (partialLine) append(partialLine, replaceOnAppend)
			partialLine = ''
			replaceOnAppend = false
		},
		reset() {
			session++
			cursor = 0
			active = false
			partialLine = ''
			replaceOnAppend = false
			pending = null
		},
	}
}
