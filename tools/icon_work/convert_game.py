
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\AboutEasterEgg.vue"
t = open(p, encoding="utf-8").read()

# 1) import 换 5 张星图
old_imports = """import blueBall from '@/assets/axolotl-balls/blueball.png'
import cyanBall from '@/assets/axolotl-balls/cyanball.png'
import pinkBall from '@/assets/axolotl-balls/pinkball.png'
import redBall from '@/assets/axolotl-balls/redball.png'
import superBall from '@/assets/axolotl-balls/superball.png'
import yellowBall from '@/assets/axolotl-balls/yellowball.png'"""
new_imports = """import blueStar from '@/assets/stars/blue.png'
import greenStar from '@/assets/stars/green.png'
import pinkStar from '@/assets/stars/pink.png'
import redStar from '@/assets/stars/red.png'
import superStar from '@/assets/stars/super.png'"""
assert old_imports in t, "import 块找不到"
t = t.replace(old_imports, new_imports, 1)

# 2) 颜色 / 半径 / 分数 / 球图数组（6→5）
old_cfg = """const colors = ['#ff8fb3', '#ffd866', '#54c9c4', '#e5484d', '#5c8ee8', '#f05ed2']
const rainbowColors = ['#ff8fb3', '#ffd866', '#54c9c4', '#5c8ee8', '#f05ed2', '#ffffff']
const radiusRatios = [0.055, 0.075, 0.098, 0.128, 0.164, 0.21]
const points = [10, 25, 60, 120, 250, 1200]"""
new_cfg = """const colors = ['#4f9cff', '#1bd96a', '#ff8fb3', '#e5484d', '#ffd866']
const rainbowColors = ['#4f9cff', '#1bd96a', '#ff8fb3', '#e5484d', '#ffd866']
const radiusRatios = [0.055, 0.078, 0.105, 0.14, 0.185]
const points = [10, 25, 60, 130, 300]"""
assert old_cfg in t, "配置数组找不到"
t = t.replace(old_cfg, new_cfg, 1)

# 3) 球图数组（顺序 blue->green->pink->red->super）
old_balls = "const ballImages = [pinkBall, yellowBall, cyanBall, redBall, blueBall, superBall]"
new_balls = "const ballImages = [blueStar, greenStar, pinkStar, redStar, superStar]"
assert old_balls in t, "ballImages 找不到"
t = t.replace(old_balls, new_balls, 1)

# 4) 存储 key
t = t.replace("const AXOLOTL_MERGE_BEST_STORAGE_KEY = 'axolotl-merge-best-score'",
              "const AXOLOTL_MERGE_BEST_STORAGE_KEY = 'starlight-merge-best-score'", 1)

# 5) 文案（messages）
text_map = {
    "defaultMessage: 'The axolotls got stranded!'": "defaultMessage: 'The stars fell down!'",
    "defaultMessage: 'Rainbow axolotl!'": "defaultMessage: 'Nether star!'",
    "defaultMessage: 'The tide is falling — keep your axolotls underwater!'": "defaultMessage: 'The sky is falling — keep merging!'",
    "defaultMessage: 'Click to drop a pink axolotl'": "defaultMessage: 'Click to drop a star'",
}
for o, n in text_map.items():
    assert o in t, f"文案找不到: {o}"
    t = t.replace(o, n, 1)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
