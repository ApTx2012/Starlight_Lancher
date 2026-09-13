
import os, glob

ROOT = r"D:\Project\Starlight_Lancher"
LOCALES = os.path.join(ROOT, "apps", "app-frontend", "src", "locales")

REPLACEMENTS = {
    "en-US": (
        '"message": "Starlight Launcher is a modified version of the open-source Modrinth codebase."',
        '"message": "Starlight Launcher is a modified version of the Axolotl Launcher, which is based on the open-source Modrinth codebase."',
    ),
    "zh-CN": (
        '"message": "Starlight Launcher 是开源项目 Modrinth 代码库的修改版本。"',
        '"message": "Starlight Launcher 是基于 Axolotl 启动器修改的版本，Axolotl 启动器基于开源项目 Modrinth 代码库。"',
    ),
    "zh-TW": (
        '"message": "Starlight Launcher 是開源專案 Modrinth 程式碼庫的修改版本。"',
        '"message": "Starlight Launcher 是基於 Axolotl 啟動器修改的版本，Axolotl 啟動器基於開源專案 Modrinth 程式碼庫。"',
    ),
}

for lang, (old, new) in REPLACEMENTS.items():
    p = os.path.join(LOCALES, lang, "index.json")
    t = open(p, encoding="utf-8").read()
    if old not in t:
        print(f"{lang}: 找不到原句，跳过")
        continue
    t = t.replace(old, new, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)
    import json
    json.load(open(p, encoding="utf-8"))  # 校验合法
    print(f"{lang}: 已改")
