import { createConsoleState } from '@modrinth/ui'

import {
	clear_log_buffer,
	get_live_log_snapshot,
	get_logs,
} from '@/helpers/logs'

import {
	createLiveLogReconciler,
	type SequencedLogEvent,
} from './live-log-reconciler'

type ConsoleState = ReturnType<typeof createConsoleState>

interface LogEntry {
	filename: string
	name?: string
	log_type: string
	output?: string | null
	age?: number
	live?: boolean
}

interface InstanceConsoleEntry {
	liveConsole: ConsoleState
	historicalConsole: ConsoleState
	historicalCache: Map<string, string>
	logList: LogEntry[] | null
	liveLog: ReturnType<typeof createLiveLogReconciler<ProcessLogPayload>>
}

interface ProcessLogPayload extends SequencedLogEvent {
	type: 'log4j' | 'legacy'
	message?: string
	logger_name?: string
	level?: string
	thread_name?: string
	timestamp_millis?: number
	throwable?: string
}

const instances = new Map<string, InstanceConsoleEntry>()

function getOrCreate(instanceId: string): InstanceConsoleEntry {
	let entry = instances.get(instanceId)
	if (entry) return entry

	const liveConsole = createConsoleState()
	const liveLog = createLiveLogReconciler<ProcessLogPayload>(
		() => get_live_log_snapshot(instanceId),
		(snapshot) => {
			liveConsole.clear()
			void liveConsole.addLegacyLog(
				snapshot.lines.map((line) => line.message).join('\n'),
			)
		},
		(payload) => {
			if (payload.type === 'log4j') {
				liveConsole.addLog4jEvent(payload)
			} else if (payload.message !== undefined) {
				void liveConsole.addLegacyLog(payload.message)
			}
		},
	)
	entry = {
		liveConsole,
		historicalConsole: createConsoleState(),
		historicalCache: new Map(),
		logList: null,
		liveLog,
	}
	instances.set(instanceId, entry)
	return entry
}

async function hydrate(instanceId: string): Promise<void> {
	const entry = getOrCreate(instanceId)
	await entry.liveLog.sync()
}

async function getHistoricalLogs(instanceId: string): Promise<LogEntry[]> {
	const entry = getOrCreate(instanceId)
	if (entry.logList) return entry.logList

	const logs: LogEntry[] = await get_logs(instanceId, true)
	entry.logList = logs

	for (const log of logs) {
		if (log.output) {
			entry.historicalCache.set(log.filename, log.output)
		}
	}

	return logs
}

function getHistoricalContent(instanceId: string, filename: string): string | undefined {
	return instances.get(instanceId)?.historicalCache.get(filename)
}

function invalidate(instanceId: string): void {
	const entry = instances.get(instanceId)
	if (!entry) return
	entry.historicalCache.clear()
	entry.logList = null
}

async function clearLive(instanceId: string): Promise<void> {
	const entry = getOrCreate(instanceId)
	await clear_log_buffer(instanceId)
	await entry.liveLog.resync()
}

function destroy(instanceId: string): void {
	instances.get(instanceId)?.liveLog.dispose()
	instances.delete(instanceId)
}

export function useInstanceConsole(instanceId: string) {
	const entry = getOrCreate(instanceId)
	return {
		liveConsole: entry.liveConsole,
		historicalConsole: entry.historicalConsole,
		hydrate: () => hydrate(instanceId),
		getHistoricalLogs: () => getHistoricalLogs(instanceId),
		getHistoricalContent: (filename: string) => getHistoricalContent(instanceId, filename),
		invalidate: () => invalidate(instanceId),
		clearLive: () => clearLive(instanceId),
		appendLive: (payload: ProcessLogPayload) => entry.liveLog.accept(payload),
		resyncLive: () => entry.liveLog.resync(),
		destroy: () => destroy(instanceId),
	}
}
