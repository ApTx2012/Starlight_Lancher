import { ref, watch } from 'vue'

/**
 * 启动器界面缩放（百分比）。
 * 这是纯本地的显示偏好，用 localStorage 保存即可，无需写入后端设置数据库。
 */
const UI_SCALE_STORAGE_KEY = 'starlight-ui-scale'
const MIN_UI_SCALE = 50
const MAX_UI_SCALE = 200
const DEFAULT_UI_SCALE = 100

/** 把缩放值限制在允许范围内。 */
function clampUiScale(value: number): number {
	if (!Number.isFinite(value)) return DEFAULT_UI_SCALE
	return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(value)))
}

/** 从 localStorage 读取已保存的缩放值。 */
function readStoredUiScale(): number {
	try {
		const raw = localStorage.getItem(UI_SCALE_STORAGE_KEY)
		if (raw === null) return DEFAULT_UI_SCALE
		return clampUiScale(Number(raw))
	} catch {
		return DEFAULT_UI_SCALE
	}
}

export const uiScale = ref(readStoredUiScale())

export function setUiScale(value: number): void {
	uiScale.value = clampUiScale(value)
}

export function resetUiScale(): void {
	setUiScale(DEFAULT_UI_SCALE)
}

export { DEFAULT_UI_SCALE, MAX_UI_SCALE, MIN_UI_SCALE }

/** 把缩放应用到文档根节点，并在变化时持久化。 */
export function installUiScale(): void {
	const apply = (value: number) => {
		const factor = String(value / 100)
		const root = document.documentElement
		root.style.setProperty('--ui-scale', factor)
		// 用 CSS zoom 整体缩放界面（含内嵌网页），在 WebView2/WebKit 上最可靠。
		root.style.setProperty('zoom', factor)
	}

	apply(uiScale.value)
	watch(uiScale, (value) => {
		apply(value)
		try {
			localStorage.setItem(UI_SCALE_STORAGE_KEY, String(value))
		} catch (error) {
			console.warn('保存界面缩放失败', error)
		}
	})
}