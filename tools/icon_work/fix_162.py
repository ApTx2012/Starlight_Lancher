
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\settings\AboutSettings.vue"
t = open(p, encoding="utf-8").read()
old = "defaultMessage: 'Starlight Launcher is a modified version of the open-source Modrinth codebase.',"
new = "defaultMessage: 'Starlight Launcher is a modified version of the Axolotl Launcher, which is based on the open-source Modrinth codebase.',"
assert old in t, "找不到第162行原句"
t = t.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
print("新句:", new)
