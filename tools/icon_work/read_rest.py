
t = open(r"D:\Project\Starlight_Lancher\tools\icon_work\old_merge_game.vue", encoding="utf-8").read()
lines = t.split("\n")
print("=== messages 全貌 (221-253) ===")
for i in range(220, 254):
    print(f"{i+1}: {lines[i]}")
print("\n=== drawAxolotl 绘制 (689-757) ===")
for i in range(688, 757):
    print(f"{i+1}: {lines[i]}")
