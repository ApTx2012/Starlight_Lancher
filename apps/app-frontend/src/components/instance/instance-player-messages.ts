import { defineMessages } from '@modrinth/ui'

export const playerMessages = defineMessages({
	title: { id: 'app.instance-player.title', defaultMessage: 'Choose an instance player' },
	remember: {
		id: 'app.instance-player.remember',
		defaultMessage:
			'This instance will keep using your choice. Switch players in instance settings.',
	},
	restore: {
		id: 'app.instance-player.restore',
		defaultMessage: 'Sign in again as {name}. To choose someone else, open instance settings.',
	},
	loading: { id: 'app.instance-player.loading', defaultMessage: 'Loading signed-in players…' },
	licensed: { id: 'app.instance-player.licensed', defaultMessage: 'Minecraft account' },
	skin: { id: 'app.instance-player.skin', defaultMessage: 'Skin site player' },
	offline: { id: 'app.instance-player.offline', defaultMessage: 'Offline player' },
	empty: {
		id: 'app.instance-player.empty',
		defaultMessage: 'No available skin site players. You can create a player on the skin site.',
	},
	signIn: { id: 'app.instance-player.sign-in', defaultMessage: 'Sign in to choose a player.' },
	retry: { id: 'app.instance-player.retry', defaultMessage: 'Retry' },
	skinLogin: { id: 'app.instance-player.skin-login', defaultMessage: 'Sign in to skin site' },
	or: { id: 'app.instance-player.or', defaultMessage: 'Or' },
	useMicrosoft: {
		id: 'app.instance-player.use-microsoft',
		defaultMessage: 'Use a Minecraft account',
	},
	saving: { id: 'app.instance-player.saving', defaultMessage: 'Saving instance player…' },
	setting: { id: 'app.instance-player.setting', defaultMessage: 'Instance player' },
	firstLaunch: {
		id: 'app.instance-player.first-launch',
		defaultMessage: 'Choose a player on first launch',
	},
	change: { id: 'app.instance-player.change', defaultMessage: 'Switch instance player' },
})
