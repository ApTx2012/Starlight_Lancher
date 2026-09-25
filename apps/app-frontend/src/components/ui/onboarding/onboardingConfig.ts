import { defineMessages, type MessageDescriptor } from '@modrinth/ui'

export type OnboardingInteraction = 'manual' | 'navigate' | 'activate' | 'inspect'
export type OnboardingMode = 'main' | 'instance'
export type CreationPath = 'custom'
export type StepDestination = string | 'complete'

export type OnboardingStep = {
	id: string
	targetId?: string
	interaction: OnboardingInteraction
	title: MessageDescriptor
	description: MessageDescriptor
	action: MessageDescriptor
	spotlight?: 'control'
	expectedPath?: string
	next?: StepDestination
	closeSettingsAfter?: boolean
	nextByCreationPath?: Partial<Record<CreationPath, StepDestination>>
	branchByTarget?: Record<
		string,
		{
			creationPath?: CreationPath
			next: StepDestination
		}
	>
}

export const onboardingMessages = defineMessages({
	welcomeTitle: {
		id: 'app.onboarding.welcome.title',
		defaultMessage: 'Everything is ready',
	},
	welcomeDescription: {
		id: 'app.onboarding.welcome.description',
		defaultMessage:
			'Your instances, content, worlds, and downloads now have one home. Let us take a quick lap before you settle in.',
	},
	welcomeFooter: {
		id: 'app.onboarding.welcome.footer',
		defaultMessage: 'Your last next launcher.',
	},
	start: { id: 'app.onboarding.action.start', defaultMessage: 'Take the tour' },
	discoverTitle: { id: 'app.onboarding.discover.title', defaultMessage: 'Find something new' },
	discoverDescription: {
		id: 'app.onboarding.discover.description',
		defaultMessage:
			'Modpacks, mods, plugins, resource packs, shaders: the good kind of rabbit hole.',
	},
	clickDiscover: {
		id: 'app.onboarding.action.click-discover',
		defaultMessage: 'Click Discover content to continue',
	},
	browseTitle: { id: 'app.onboarding.browse.title', defaultMessage: 'Search with receipts' },
	browseDescription: {
		id: 'app.onboarding.browse.description',
		defaultMessage:
			'Use types, search, and filters to narrow things down. Project pages keep versions, changelogs, galleries, and install options in one place.',
	},
	favoritesTitle: {
		id: 'app.onboarding.favorites.title',
		defaultMessage: 'Keep a short list',
	},
	favoritesDescription: {
		id: 'app.onboarding.favorites.description',
		defaultMessage:
			'Open Favorites to revisit saved mods, resource packs, data packs, and shaders. The launcher refreshes their project details, then you can choose an instance and add mixed sources to the same install cart.',
	},
	clickFavorites: {
		id: 'app.onboarding.action.click-favorites',
		defaultMessage: 'Click Favorites to continue',
	},
	homeLayoutTitle: {
		id: 'app.onboarding.home-layout.title',
		defaultMessage: 'Switch your home',
	},
	homeLayoutDescription: {
		id: 'app.onboarding.home-layout.description',
		defaultMessage:
			'Use the bottom-right control to switch between the StarLight skin site home and the focused instance launcher.',
	},
	continueArea: {
		id: 'app.onboarding.action.continue-area',
		defaultMessage: 'Click anywhere for the next bit',
	},
	skinsTitle: { id: 'app.onboarding.skins.title', defaultMessage: 'A new look, maybe' },
	skinsDescription: {
		id: 'app.onboarding.skins.description',
		defaultMessage:
			'Choose a skin site player or Minecraft account, then preview and apply the skins available to that profile.',
	},
	clickSkins: {
		id: 'app.onboarding.action.click-skins',
		defaultMessage: 'Click Skin selector to continue',
	},
	skinsPageTitle: { id: 'app.onboarding.skins-page.title', defaultMessage: 'Your skin drawer' },
	skinsPageDescription: {
		id: 'app.onboarding.skins-page.description',
		defaultMessage:
			'Select a profile, preview its available skins, and apply changes when that account supports skin management.',
	},
	downloadsTitle: { id: 'app.onboarding.downloads.title', defaultMessage: 'Download control room' },
	downloadsDescription: {
		id: 'app.onboarding.downloads.description',
		defaultMessage:
			'Installations and content downloads report in here, so nothing has to disappear mysteriously.',
	},
	clickDownloads: {
		id: 'app.onboarding.action.click-downloads',
		defaultMessage: 'Click Downloads to continue',
	},
	downloadsPageTitle: {
		id: 'app.onboarding.downloads-page.title',
		defaultMessage: 'Nothing gets lost',
	},
	downloadsPageDescription: {
		id: 'app.onboarding.downloads-page.description',
		defaultMessage:
			'Active work, history, errors, retries, cancellations, and diagnostics all leave a paper trail here.',
	},
	settingsTitle: { id: 'app.onboarding.settings.title', defaultMessage: 'Make it yours' },
	settingsDescription: {
		id: 'app.onboarding.settings.description',
		defaultMessage:
			'The useful controls live here: launcher preferences, game launch behavior, content downloads, and privacy.',
	},
	clickSettings: {
		id: 'app.onboarding.action.click-settings',
		defaultMessage: 'Click Settings to continue',
	},
	appearanceTitle: { id: 'app.onboarding.appearance.title', defaultMessage: 'Set the vibe' },
	appearanceDescription: {
		id: 'app.onboarding.appearance.description',
		defaultMessage:
			'Theme, accent, backgrounds, and window effects all live here. Make the launcher feel familiar.',
	},
	defaultsTitle: { id: 'app.onboarding.defaults.title', defaultMessage: 'Start ahead' },
	defaultsDescription: {
		id: 'app.onboarding.defaults.description',
		defaultMessage:
			'New instances inherit these choices, so you do not have to repeat the homework.',
	},
	resourcesTitle: {
		id: 'app.onboarding.resources.title',
		defaultMessage: 'Do not cook the computer',
	},
	resourcesDescription: {
		id: 'app.onboarding.resources.description',
		defaultMessage:
			'Choose how content downloads and installs, from download sources to safety checks.',
	},
	clickTab: { id: 'app.onboarding.action.click-tab', defaultMessage: 'Click this tab to continue' },
	libraryTitle: { id: 'app.onboarding.library.title', defaultMessage: 'Your launch shelf' },
	libraryDescription: {
		id: 'app.onboarding.library.description',
		defaultMessage:
			'Instances keep versions, loaders, content, and saves separate. No accidental mod soup.',
	},
	clickLibrary: {
		id: 'app.onboarding.action.click-library',
		defaultMessage: 'Click Library to continue',
	},
	libraryPageTitle: {
		id: 'app.onboarding.library-page.title',
		defaultMessage: 'Everything, in its place',
	},
	libraryPageDescription: {
		id: 'app.onboarding.library-page.description',
		defaultMessage:
			'Switch between all instances, modpacks, and custom setups, then open any instance to manage it.',
	},
	createTitle: { id: 'app.onboarding.create.title', defaultMessage: 'Make a fresh start' },
	createDescription: {
		id: 'app.onboarding.create.description',
		defaultMessage: 'Start from scratch or bring in an existing instance or modpack. Your call.',
	},
	clickCreate: {
		id: 'app.onboarding.action.click-create',
		defaultMessage: 'Click Create new instance to continue',
	},
	creationTitle: { id: 'app.onboarding.creation.title', defaultMessage: 'Pick your route' },
	instanceModeTitle: {
		id: 'app.onboarding.instance-mode.title',
		defaultMessage: 'Choose your instance type',
	},
	instanceModeDescription: {
		id: 'app.onboarding.instance-mode.description',
		defaultMessage:
			'StarLight automatically installs the administrator-selected modpack and versions, then checks and completes updates before every launch. A StarLight login is required. Choose Local to select your own versions and modpacks for other servers or single-player.',
	},
	creationDescription: {
		id: 'app.onboarding.creation.description',
		defaultMessage:
			'Start fresh with a custom setup, or import an existing instance or modpack. Your call.',
	},
	clickCreationMethod: {
		id: 'app.onboarding.action.click-creation-method',
		defaultMessage: 'Choose a route to continue',
	},
	creationNameTitle: {
		id: 'app.onboarding.creation-name.title',
		defaultMessage: 'Give it a memorable name',
	},
	creationNameDescription: {
		id: 'app.onboarding.creation-name.description',
		defaultMessage: 'Pick a name your future self will recognize at a glance.',
	},
	creationLoaderTitle: {
		id: 'app.onboarding.creation-loader.title',
		defaultMessage: 'Choose the engine',
	},
	creationLoaderDescription: {
		id: 'app.onboarding.creation-loader.description',
		defaultMessage: 'Vanilla, Fabric, Forge, NeoForge, and friends. Pick what your content needs.',
	},
	creationVersionTitle: {
		id: 'app.onboarding.creation-version.title',
		defaultMessage: 'Set the game version',
	},
	creationVersionDescription: {
		id: 'app.onboarding.creation-version.description',
		defaultMessage:
			'Choose the Minecraft version for this instance. Compatibility likes specifics.',
	},
	creationConfirmTitle: {
		id: 'app.onboarding.creation-confirm.title',
		defaultMessage: 'One last look',
	},
	creationConfirmDescription: {
		id: 'app.onboarding.creation-confirm.description',
		defaultMessage:
			'This creates the instance with your choices. I keep a strict hands-off policy.',
	},
	finishArea: {
		id: 'app.onboarding.action.finish-area',
		defaultMessage: 'Click anywhere and you are all set',
	},
	instanceActionsTitle: {
		id: 'app.onboarding.instance-actions.title',
		defaultMessage: 'The main controls',
	},
	instanceActionsDescription: {
		id: 'app.onboarding.instance-actions.description',
		defaultMessage:
			'Launch or configure this instance here. You can launch another window while it is running; use the top bar to stop an individual window. Choose a player on first launch; the instance remembers your choice until you switch it in settings.',
	},
	instanceTabsTitle: {
		id: 'app.onboarding.instance-tabs.title',
		defaultMessage: 'The rest of the workshop',
	},
	instanceTabsDescription: {
		id: 'app.onboarding.instance-tabs.description',
		defaultMessage: 'Use these tabs for content, files, screenshots, worlds, and logs. Tidy chaos.',
	},
	labTitle: {
		id: 'app.onboarding.lab.title',
		defaultMessage: 'Useful tools, built in',
	},
	labDescription: {
		id: 'app.onboarding.lab.description',
		defaultMessage:
			'The Lab keeps Minecraft creation, world, and maintenance tools inside the launcher.',
	},
	clickLab: {
		id: 'app.onboarding.action.click-lab',
		defaultMessage: 'Click Lab to continue',
	},
	labToolsTitle: {
		id: 'app.onboarding.lab-tools.title',
		defaultMessage: 'Local tools for Minecraft',
	},
	labToolsDescription: {
		id: 'app.onboarding.lab-tools.description',
		defaultMessage:
			'Create and edit skins, generate formatted text and recipes, explore seeds, inspect schematics, and translate mods locally.',
	},
	skip: { id: 'app.onboarding.action.skip', defaultMessage: 'Leave the tour' },
	mascotAlt: { id: 'app.onboarding.mascot-alt', defaultMessage: 'Starlight guide' },
})

const step = (
	id: string,
	interaction: OnboardingInteraction,
	copy: {
		title: MessageDescriptor
		description: MessageDescriptor
		action: MessageDescriptor
	},
	options: Omit<OnboardingStep, 'id' | 'interaction' | 'title' | 'description' | 'action'> = {},
): OnboardingStep => ({ id, interaction, ...copy, ...options })

const copy = (
	title: MessageDescriptor,
	description: MessageDescriptor,
	action: MessageDescriptor,
) => ({ title, description, action })

const control = (targetId: string, expectedPath?: string) => ({
	targetId,
	spotlight: 'control' as const,
	...(expectedPath ? { expectedPath } : {}),
})

const inspect = (
	id: string,
	targetId: string,
	title: MessageDescriptor,
	description: MessageDescriptor,
) => step(id, 'inspect', copy(title, description, onboardingMessages.continueArea), { targetId })

const settingsTourSteps: Array<[string, string, MessageDescriptor, MessageDescriptor]> = [
	[
		'settings-interface',
		'settings-tab-interface',
		onboardingMessages.appearanceTitle,
		onboardingMessages.appearanceDescription,
	],
	[
		'settings-launch-defaults',
		'settings-tab-launch-defaults',
		onboardingMessages.defaultsTitle,
		onboardingMessages.defaultsDescription,
	],
	[
		'settings-content-downloads',
		'settings-tab-content-downloads',
		onboardingMessages.resourcesTitle,
		onboardingMessages.resourcesDescription,
	],
]

export const onboardingTours: Record<OnboardingMode, OnboardingStep[]> = {
	main: [
		step(
			'welcome',
			'manual',
			copy(
				onboardingMessages.welcomeTitle,
				onboardingMessages.welcomeDescription,
				onboardingMessages.start,
			),
		),
		inspect(
			'home-layout-switch',
			'home-layout-switch',
			onboardingMessages.homeLayoutTitle,
			onboardingMessages.homeLayoutDescription,
		),
		step(
			'discover-navigation',
			'navigate',
			copy(
				onboardingMessages.discoverTitle,
				onboardingMessages.discoverDescription,
				onboardingMessages.clickDiscover,
			),
			control('nav-discover', '/browse/modpack'),
		),
		inspect(
			'discover-content',
			'browse-content',
			onboardingMessages.browseTitle,
			onboardingMessages.browseDescription,
		),
		step(
			'discover-favorites-navigation',
			'navigate',
			copy(
				onboardingMessages.favoritesTitle,
				onboardingMessages.favoritesDescription,
				onboardingMessages.clickFavorites,
			),
			control('browse-favorites-tab', '/browse/favorites'),
		),
		inspect(
			'discover-favorites-content',
			'browse-favorites-content',
			onboardingMessages.favoritesTitle,
			onboardingMessages.favoritesDescription,
		),
		step(
			'skins-navigation',
			'navigate',
			copy(
				onboardingMessages.skinsTitle,
				onboardingMessages.skinsDescription,
				onboardingMessages.clickSkins,
			),
			control('nav-skins', '/skins'),
		),
		inspect(
			'skins-page',
			'skins-page',
			onboardingMessages.skinsPageTitle,
			onboardingMessages.skinsPageDescription,
		),
		step(
			'lab-navigation',
			'navigate',
			copy(
				onboardingMessages.labTitle,
				onboardingMessages.labDescription,
				onboardingMessages.clickLab,
			),
			control('nav-lab', '/lab'),
		),
		inspect(
			'lab-tools',
			'lab-tools',
			onboardingMessages.labToolsTitle,
			onboardingMessages.labToolsDescription,
		),
		step(
			'downloads-navigation',
			'navigate',
			copy(
				onboardingMessages.downloadsTitle,
				onboardingMessages.downloadsDescription,
				onboardingMessages.clickDownloads,
			),
			control('nav-downloads', '/downloads'),
		),
		inspect(
			'downloads-tabs',
			'downloads-tabs',
			onboardingMessages.downloadsPageTitle,
			onboardingMessages.downloadsPageDescription,
		),
		step(
			'settings-navigation',
			'activate',
			copy(
				onboardingMessages.settingsTitle,
				onboardingMessages.settingsDescription,
				onboardingMessages.clickSettings,
			),
			control('nav-settings', '/settings'),
		),
		...settingsTourSteps.map(([id, targetId, title, description], index) =>
			step(id, 'activate', copy(title, description, onboardingMessages.clickTab), {
				...control(targetId),
				closeSettingsAfter: index === settingsTourSteps.length - 1,
			}),
		),
		step(
			'library-navigation',
			'navigate',
			copy(
				onboardingMessages.libraryTitle,
				onboardingMessages.libraryDescription,
				onboardingMessages.clickLibrary,
			),
			control('nav-library', '/library'),
		),
		inspect(
			'library-content',
			'library-content',
			onboardingMessages.libraryPageTitle,
			onboardingMessages.libraryPageDescription,
		),
		step(
			'create-instance',
			'navigate',
			copy(
				onboardingMessages.createTitle,
				onboardingMessages.createDescription,
				onboardingMessages.clickCreate,
			),
			control('create-instance', '/create'),
		),
		inspect(
			'creation-instance-mode',
			'creation-instance-mode',
			onboardingMessages.instanceModeTitle,
			onboardingMessages.instanceModeDescription,
		),
		step(
			'creation-flow',
			'activate',
			copy(
				onboardingMessages.creationTitle,
				onboardingMessages.creationDescription,
				onboardingMessages.clickCreationMethod,
			),
			{
				targetId: 'creation-methods',
				branchByTarget: {
					'creation-method-starlight': { next: 'complete' },
					'creation-method-custom': { creationPath: 'custom', next: 'creation-name' },
					'creation-method-import': { next: 'complete' },
				},
			},
		),
		inspect(
			'creation-name',
			'creation-name',
			onboardingMessages.creationNameTitle,
			onboardingMessages.creationNameDescription,
		),
		inspect(
			'creation-loader',
			'creation-loader',
			onboardingMessages.creationLoaderTitle,
			onboardingMessages.creationLoaderDescription,
		),
		step(
			'creation-version',
			'inspect',
			copy(
				onboardingMessages.creationVersionTitle,
				onboardingMessages.creationVersionDescription,
				onboardingMessages.continueArea,
			),
			{
				targetId: 'creation-game-version',
				nextByCreationPath: { custom: 'creation-confirm' },
			},
		),
		step(
			'creation-confirm',
			'inspect',
			copy(
				onboardingMessages.creationConfirmTitle,
				onboardingMessages.creationConfirmDescription,
				onboardingMessages.finishArea,
			),
			{ targetId: 'creation-confirm' },
		),
	],
	instance: [
		inspect(
			'instance-actions',
			'instance-actions',
			onboardingMessages.instanceActionsTitle,
			onboardingMessages.instanceActionsDescription,
		),
		step(
			'instance-tabs',
			'inspect',
			copy(
				onboardingMessages.instanceTabsTitle,
				onboardingMessages.instanceTabsDescription,
				onboardingMessages.finishArea,
			),
			{ targetId: 'instance-tabs' },
		),
	],
}

export function onboardingTargetSelector(targetId: string) {
	return `[data-onboarding-id="${targetId}"]`
}
