import type { InstallJobSnapshot, InstallJobStatus } from './install.ts'

const activeStatuses = new Set<InstallJobStatus>([
	'queued',
	'running',
	'canceling',
	'waiting_for_user',
])
const failureStatuses = new Set<InstallJobStatus>(['failed', 'interrupted'])

/**
 * Keeps the popup scoped to work the user could actually have observed.
 * Finished jobs already present when the action bar starts belong to download
 * history; they must not be resurrected by an unrelated loading event.
 */
export function createInstallJobNotificationFilter(initialJobs: InstallJobSnapshot[]) {
	const missedFinishedJobIds = new Set(
		initialJobs.filter((job) => !activeStatuses.has(job.status)).map((job) => job.job_id),
	)
	let visibleJobIds = new Set<string>()

	return (nextJobs: InstallJobSnapshot[]) => {
		const visibleJobs = nextJobs.filter((job) => {
			if (activeStatuses.has(job.status)) return true
			if (visibleJobIds.has(job.job_id)) return true
			return failureStatuses.has(job.status) && !missedFinishedJobIds.has(job.job_id)
		})

		visibleJobIds = new Set(visibleJobs.map((job) => job.job_id))
		return visibleJobs
	}
}
