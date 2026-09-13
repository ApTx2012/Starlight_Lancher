import glob, os, re
cands = glob.glob(r"D:\Project\Starlight_Lancher\node_modules\.pnpm\floating-vue@*\node_modules\floating-vue\dist\*")
cands = [c for c in cands if os.path.isfile(c)]
print("dist 文件:", [os.path.basename(c) for c in cands])
for c in cands:
    t = open(c, encoding="utf-8", errors="replace").read()
    # 找 export 里跟 tooltip 相关的
    names = set(re.findall(r"export\s*\{([^}]*)\}", t))
    hits = [n.strip() for grp in names for n in grp.split(",") if "ooltip" in n or "ispose" in n]
    if hits:
        print(f"\n{os.path.basename(c)} 导出含 tooltip/dispose:", hits[:20])
    # 找 hide/dispose 函数名
    for kw in ("hideAllTooltips", "disposeAllTooltips", "hideAllPoppers", "disposeTooltips", "hideTooltips"):
        if kw in t:
            print(f"  [{os.path.basename(c)}] 含 {kw}")