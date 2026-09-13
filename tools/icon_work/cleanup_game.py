
# 1) 游戏文件：改内部标识符
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\AboutEasterEgg.vue"
t = open(p, encoding="utf-8").read()
t = t.replace("AXOLOTL_MERGE_BEST_STORAGE_KEY", "MERGE_BEST_STORAGE_KEY")
t = t.replace("drawAxolotl", "drawMergePiece")
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("游戏文件: AXOLOTL_MERGE_BEST_STORAGE_KEY -> MERGE_BEST_STORAGE_KEY, drawAxolotl -> drawMergePiece")
print("  残留 axolotl:", "axolotl" in t.lower())

# 2) about-member-experiences.ts：更新过时注释
p2 = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\settings\about-member-experiences.ts"
t2 = open(p2, encoding="utf-8").read()
old = "// 原 'axolotl-merge' 彩蛋已移除，改为通用占位组件 AboutEasterEgg.vue。"
new = "// 下界之星合成彩蛋（AboutEasterEgg.vue），由长按成员名 / 暗号 / Konami 秘技触发。"
assert old in t2, "注释找不到"
t2 = t2.replace(old, new, 1)
open(p2, "w", encoding="utf-8", newline="\n").write(t2)
print("注释已更新")
