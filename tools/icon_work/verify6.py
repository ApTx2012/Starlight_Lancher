
t = open(r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\AboutEasterEgg.vue", encoding="utf-8").read()
for i, line in enumerate(t.split("\n")):
    if any(k in line for k in ("import blueStar", "import greenStar", "import pinkStar", "import redStar", "import yellowStar", "import superStar",
                               "const colors =", "const ballImages =", "starlight-merge-best-score",
                               "stars fell down", "Nether star", "sky is falling", "drop a star")):
        print(f"{i+1}: {line.strip()}")
print("\n残留 axolotl-balls:", "axolotl-balls" in t)
print("残留 axolotl 文案:", "axolotl" in t.lower())
