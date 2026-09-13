import glob, os
cands = glob.glob(r"D:\Project\Starlight_Lancher\node_modules\.pnpm\floating-vue*\node_modules\floating-vue\dist\*.mjs")
cands += glob.glob(r"D:\Project\Starlight_Lancher\node_modules\floating-vue\dist\*")
print("候选:", cands[:5])
found = False
for c in cands:
    if not os.path.isfile(c):
        continue
    try:
        t = open(c, encoding="utf-8", errors="replace").read()
    except Exception:
        continue
    if "hideAllTooltips" in t or "disposeTooltips" in t:
        print("文件:", c)
        print("  含 hideAllTooltips:", "hideAllTooltips" in t)
        print("  含 disposeTooltips:", "disposeTooltips" in t)
        found = True
        break
if not found:
    print("没找到（可能打包成 cjs/index）")