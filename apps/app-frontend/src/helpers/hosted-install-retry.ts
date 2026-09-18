import type { InstallJobSnapshot } from './install.ts'

interface InstallRetryDependencies {
	getInstanceMode: (instanceId: string) => Promise<'starlight' | 'local'>
	retryHosted: (instanceId: string, sourceJobId: string) => Promise<void>
	retryGeneric: (jobId: string) => Promise<InstallJobSnapshot>
}

/**
 * Minecraft installation jobs started by StarLight synchronization are only
 * one stage of the full operation. Retrying that stage alone leaves the
 * pending pack journal unapplied, so these jobs must resume through
 * `hostedSync` instead of the generic install-job retry command.
 */
export function hostedRuntimeRetryInstanceId(job: InstallJobSnapshot): string | null {
	if (job.kind !== 'install_existing_instance' || job.instance_deleted) return null
	return job.instance_id ?? job.target.instance_id ?? null
}

export function hostedRetryRoute(instanceId: string): string {
	return `/instance/${encodeURIComponent(instanceId)}`
}

export async function retryInstallJob(
	job: InstallJobSnapshot,
	dependencies: InstallRetryDependencies,
): Promise<InstallJobSnapshot | null> {
	const instanceId = hostedRuntimeRetryInstanceId(job)
	if (instanceId && (await dependencies.getInstanceMode(instanceId)) === 'starlight') {
		await dependencies.retryHosted(instanceId, job.job_id)
		return null
	}
	return dependencies.retryGeneric(job.job_id)
}
