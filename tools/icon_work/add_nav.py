
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\App.vue"
lines = open(p, encoding="utf-8").read().split("\n")

# 1) import 加 GlobeIcon：在第 5 行(CompassIcon)后、第 4 行(ChangeSkinIcon)开始那个块里
#    找到 "CompassIcon," 那行，在其后插 "GlobeIcon,"
imp_idx = None
for i, ln in enumerate(lines):
    if ln.strip() == "CompassIcon,":
        imp_idx = i
        break
assert imp_idx is not None, "找不到 CompassIcon import"
lines.insert(imp_idx + 1, "\tGlobeIcon,")

# 2) messages 加 starlightSkin：在 skinSelector 块结束的 '},' (原737) 后插
#    因为上面插了1行，行号+1。重新定位 skinSelector 块
skin_msg_idx = None
for i, ln in enumerate(lines):
    if "app.navigation.skin-selector" in ln:
        # 找它下面的 '},'
        for j in range(i, i + 5):
            if lines[j].strip() == "},":
                skin_msg_idx = j
                break
        break
assert skin_msg_idx is not None, "找不到 skinSelector 消息块结尾"
new_msg = [
    "\tstarlightSkin: {",
    "\t\tid: 'app.navigation.starlight-skin',",
    "\t\tdefaultMessage: '斯达莱特',",
    "\t},",
]
lines[skin_msg_idx + 1:skin_msg_idx + 1] = new_msg

# 3) 模板加 NavButton：在 skin selector 的 </NavButton> (原2316) 后
#    找 'nav-skins' 的块结尾 </NavButton>
nav_idx = None
for i, ln in enumerate(lines):
    if 'data-onboarding-id="nav-skins"' in ln:
        for j in range(i, i + 10):
            if "</NavButton>" in lines[j]:
                nav_idx = j
                break
        break
assert nav_idx is not None, "找不到 nav-skins 的 NavButton 结尾"
new_nav = [
    "\t\t\t\t<NavButton",
    '\t\t\t\t\tv-tooltip.right="formatMessage(messages.starlightSkin)"',
    '\t\t\t\t\tdata-onboarding-id="nav-starlight-skin"',
    '\t\t\t\t\tto="/starlight-skin"',
    "\t\t\t\t>",
    "\t\t\t\t\t<GlobeIcon />",
    "\t\t\t\t</NavButton>",
]
lines[nav_idx + 1:nav_idx + 1] = new_nav

open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("完成。")
print("import 行:", lines[imp_idx], "->", lines[imp_idx+1])
