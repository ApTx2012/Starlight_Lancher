p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\settings\AboutSettings.vue"
t = open(p, encoding="utf-8").read()

# 1) import openUrl
old_imp = "import { getVersion } from '@tauri-apps/api/app'"
new_imp = "import { getVersion } from '@tauri-apps/api/app'\nimport { openUrl } from '@tauri-apps/plugin-opener'"
assert old_imp in t, "getVersion import 找不到"
t = t.replace(old_imp, new_imp, 1)

# 2) 暗号逻辑：区分 starlight（游戏）与 yuanshen（开链接）
old_logic = """let typedBuffer = ''
const secretCodes = ['starlight']"""
new_logic = """let typedBuffer = ''
const secretCodes = ['starlight']
const YUANSHEN_URL = 'https://ys.mihoyo.com/cloud/'"""
assert old_logic in t, "secretCodes 找不到"
t = t.replace(old_logic, new_logic, 1)

old_check = """	if (secretCodes.some((code) => typedBuffer.endsWith(code))) {
		typedBuffer = ''
		gameModal.value?.show()
		return
	}"""
new_check = """	if (typedBuffer.endsWith('yuanshen')) {
		typedBuffer = ''
		openUrl(YUANSHEN_URL).catch(() => {})
		return
	}
	if (secretCodes.some((code) => typedBuffer.endsWith(code))) {
		typedBuffer = ''
		gameModal.value?.show()
		return
	}"""
assert old_check in t, "暗号判断块找不到"
t = t.replace(old_check, new_check, 1)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
print("  含 openUrl import:", "plugin-opener" in t)
print("  含 yuanshen:", "yuanshen" in t)