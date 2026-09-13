
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\settings\AboutSettings.vue"
t = open(p, encoding="utf-8").read()
old = "const secretCodes = ['cyf112233', 'cxkcxkckx']"
new = "const secretCodes = ['starlight']"
assert old in t, "找不到 secretCodes"
t = t.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
print("新:", new)
