
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\routes.js"
lines = open(p, encoding="utf-8").read().split("\n")

# 在第 95 行 (idx 94) 的 '},' 之后插入新路由；即 idx 95 前插
anchor_idx = 95  # 0-based, 原第96行 '{'
# 校验
assert lines[94].strip() == "},", f"第95行不是 '}},' 而是: {lines[94]!r}"
assert lines[95].strip() == "{", f"第96行不是 '{{' 而是: {lines[95]!r}"

new_route = [
    "\t\t{",
    "\t\t\tpath: '/starlight-skin',",
    "\t\t\tname: 'Starlight skin',",
    "\t\t\tcomponent: () => import('@/pages/StarlightSkin.vue'),",
    "\t\t\tmeta: {",
    "\t\t\t\tbreadcrumb: [{ name: 'Starlight skin' }],",
    "\t\t\t},",
    "\t\t},",
]
lines[95:95] = new_route
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("插入完成，新行数:", len(lines))
print("--- 插入区 86-105 ---")
for i in range(85, 106):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}")
