
t = open(r"D:\Project\Starlight_Lancher\tools\icon_work\old_merge_game.vue", encoding="utf-8").read()
lines = t.split("\n")
print("总行数:", len(lines))
print("\n=== 含 ball/color/radius/point/axolotl/import 的行 ===")
for i, line in enumerate(lines):
    low = line.lower()
    if any(k in low for k in ("ball", "color", "radius", "point", "axolotl", "import ", "level", "tier")):
        print(f"{i+1}: {line.rstrip()[:140]}")
