
import contributorsData from './contributors.json'
import teamData from './team.json'

export interface TeamMember {
	name: string
	avatar: string
	url?: string
	experience?: string
}

export interface Contributor {
	name: string
	avatar: string
	url: string
	contributions: number
}

const teamAvatarModules = import.meta.glob('./avatars/*', {
	eager: true,
	import: 'default',
	query: '?url',
}) as Record<string, string>

export const teamMembers: (TeamMember & { avatarUrl: string })[] = teamData.map((member) => ({
	...member,
	avatarUrl: teamAvatarModules[`./avatars/${member.avatar}`],
}))

export const contributors: (Contributor & { avatarUrl: string })[] = (
	contributorsData as Contributor[]
).map((contributor) => ({
	...contributor,
	avatarUrl: teamAvatarModules[`./avatars/${contributor.avatar}`],
}))
