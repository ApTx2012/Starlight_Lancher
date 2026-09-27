export interface LiveLogSnapshot {
	lines: Array<{ sequence: number; message: string }>
	last_sequence: number
}

export interface SequencedLogEvent {
	first_sequence: number
	last_sequence: number
}

export function createLiveLogReconciler<T extends SequencedLogEvent>(
	loadSnapshot: () => Promise<LiveLogSnapshot>,
	replace: (snapshot: LiveLogSnapshot) => void,
	append: (event: T) => void,
) {
	let lastSequence = 0
	let queued: T[] = []
	let syncing: Promise<void> | null = null
	let disposed = false

	function drainQueued(): boolean {
		const events = queued
		queued = []
		for (let index = 0; index < events.length; index++) {
			const event = events[index]!
			if (event.last_sequence <= lastSequence) continue
			if (event.first_sequence > lastSequence + 1) {
				queued.push(...events.slice(index))
				return false
			}
			append(event)
			lastSequence = event.last_sequence
		}
		return true
	}

	function sync(): Promise<void> {
		if (syncing) return syncing
		const request = (async () => {
			do {
				const snapshot = await loadSnapshot()
				if (disposed) return
				replace(snapshot)
				lastSequence = snapshot.last_sequence
			} while (!drainQueued())
		})()
		const completion = request.finally(() => {
			if (syncing === completion) syncing = null
		})
		syncing = completion
		return completion
	}

	function resync(): Promise<void> {
		return syncing ? syncing.then(sync) : sync()
	}

	function accept(event: T): Promise<void> | undefined {
		if (disposed || event.last_sequence <= lastSequence) return
		if (syncing) {
			queued.push(event)
			return syncing
		}
		if (event.first_sequence > lastSequence + 1) {
			queued.push(event)
			return sync()
		}
		append(event)
		lastSequence = event.last_sequence
	}

	return {
		accept,
		resync,
		sync,
		dispose() {
			disposed = true
			queued = []
		},
	}
}
