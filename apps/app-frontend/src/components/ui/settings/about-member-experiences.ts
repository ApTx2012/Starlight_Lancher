import type { Component } from 'vue'

import AboutEasterEgg from '../AboutEasterEgg.vue'

export type AboutMemberExperience =
	| {
			kind: 'scene'
			component: Component
			longPressDuration: number
	  }
	| {
			kind: 'color-mine'
			longPressDuration: number
	  }

// 长按「关于」页成员卡片触发的彩蛋体验。
// 下界之星合成彩蛋（AboutEasterEgg.vue），由长按成员名 / 暗号 / Konami 秘技触发。
// 若要为特定成员挂载自定义彩蛋，在这里新增条目即可。
const memberExperiences: Record<string, AboutMemberExperience> = {
	'easter-egg': {
		kind: 'scene',
		component: AboutEasterEgg,
		longPressDuration: 800,
	},
	'color-mine': {
		kind: 'color-mine',
		longPressDuration: 800,
	},
}

export function getAboutMemberExperience(experience: unknown): AboutMemberExperience | undefined {
	return typeof experience === 'string' ? memberExperiences[experience] : undefined
}
