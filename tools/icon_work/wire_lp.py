
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\pages\Index.vue"
lines = open(p, encoding="utf-8").read().split("\n")

# 1) import：在 HomePlayInsights import 行后加一行
imp_i = None
for i, ln in enumerate(lines):
    if "import HomePlayInsights from '@/components/home/HomePlayInsights.vue'" in ln:
        imp_i = i
        break
assert imp_i is not None, "找不到 HomePlayInsights import"
lines.insert(imp_i, "import HomeLaunchProgress from '@/components/home/HomeLaunchProgress.vue'")

# 2) 模板：在 <HomePlayInsights /> 前插入 <HomeLaunchProgress />
tpl_i = None
for i, ln in enumerate(lines):
    if ln.strip() == "<HomePlayInsights />":
        tpl_i = i
        break
assert tpl_i is not None, "找不到 <HomePlayInsights />"
lines.insert(tpl_i, "\t\t\t<HomeLaunchProgress />")

open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("done")
for i in range(imp_i - 1, imp_i + 2):
    print(f"{i+1}: {lines[i]}")
print("...")
for i in range(tpl_i - 2, tpl_i + 3):
    print(f"{i+1}: {lines[i]}")
