
import type { Component } from 'vue'

import AboutEasterEgg from '../AboutEasterEgg.vue'

export type AboutMemberExperience = {
	component: Component
	longPressDuration: number
}

// 长按「关于」页成员名字触发的彩蛋体验。
// 原 'axolotl-merge' 彩蛋已移除，改为通用占位组件 AboutEasterEgg.vue。
// 若要为特定成员挂载自定义彩蛋，在这里新增条目即可。
const memberExperiences: Record<string, AboutMemberExperience> = {
	'easter-egg': {
		component: AboutEasterEgg,
		longPressDuration: 800,
	},
}

export function getAboutMemberExperience(experience: unknown): AboutMemberExperience | undefined {
	return typeof experience === 'string' ? memberExperiences[experience] : undefined
}
