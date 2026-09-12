
<!--
	彩蛋占位组件（Easter Egg Placeholder）
	======================================
	原来的「美西螈合成小游戏」已被移除，这里预留给自定义彩蛋。

	触发方式（沿用原框架，见 AboutSettings.vue）：
	  1. 输入暗号：'cyf112233' 或 'cxkcxkckx'
	  2. Konami 秘技：↑↑↓↓←→←→BA
	  3. 长按「关于」页某位开发者名字（见 about-member-experiences.ts）

	如何改造成你自己的彩蛋：
	  - 直接在下方 <template> 里写你的内容（游戏 / 动画 / 展示页都行）。
	  - 如需全屏，沿用根容器的 absolute inset-0 布局。
	  - 组件通过 defineEmits 暴露 exit 事件，调用它会关闭弹窗。
	  - 若彩蛋需要独立的静态资源（图片/HTML/JS），放到 public/easteregg/ 下，
	    用 `${window.location.origin}/easteregg/...` 引用，或直接在 <template> 内联。

	当前状态：空占位，仅显示一行提示。
-->
<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'

const emit = defineEmits<{ exit: [] }>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	placeholder: {
		id: 'app.settings.about.easteregg.placeholder',
		defaultMessage: 'Easter egg goes here.',
	},
	exit: {
		id: 'app.settings.about.easteregg.exit',
		defaultMessage: 'Close',
	},
})
</script>

<template>
	<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface-1">
		<p class="m-0 text-sm text-secondary">
			{{ formatMessage(messages.placeholder) }}
		</p>
		<button
			type="button"
			class="rounded-lg bg-surface-3 px-4 py-1.5 text-sm font-medium text-contrast transition-colors hover:bg-surface-4"
			@click.stop="emit('exit')"
		>
			{{ formatMessage(messages.exit) }}
		</button>
	</div>
</template>
