import { invoke } from '@tauri-apps/api/core'
import { ref, watch } from 'vue'

/**
 * 启动器界面缩放（百分比）。
 * 通过 Tauri 原生 webview zoom（Rust 侧 set_zoom）应用，
 * 缩放值持久化到后端设置数据库（settings.ui_scale）。
 */
const MIN_UI_SCALE = 50
const MAX_UI_SCALE = 200
const DEFAULT_UI_SCALE = 100

/** 把缩放值限制在允许范围内。 */
function clampUiScale(value: number): number {
	if (!Number.isFinite(value)) return DEFAULT_UI_SCALE
	return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(value)))
}

export const uiScale = ref(DEFAULT_UI_SCALE)

export function setUiScale(value: number): void {
	uiScale.value = clampUiScale(value)
}

export function resetUiScale(): void {
	setUiScale(DEFAULT_UI_SCALE)
}

export { DEFAULT_UI_SCALE, MAX_UI_SCALE, MIN_UI_SCALE }

/**
 * 把缩放值应用到原生 webview。
 * 同时保留 --ui-scale CSS 变量，供依赖它的样式/锚点使用。
 */
async function applyUiScale(value: number): Promise<void> {
	const factor = value / 100
	document.documentElement.style.setProperty('--ui-scale', String(factor))
	try {
		await invoke('plugin:settings|set_ui_scale', { factor })
	} catch (error) {
		console.warn('应用界面缩放失败', error)
	}
}

/**
 * 初始化缩放：应用当前值，并在变化时同步到原生 webview。
 * 初值由调用方（App 初始化流程）在读取后端设置后通过 setUiScale 覆盖。
 */
export function installUiScale(): void {
	void applyUiScale(uiScale.value)
	watch(uiScale, (value) => {
		void applyUiScale(value)
	})
}