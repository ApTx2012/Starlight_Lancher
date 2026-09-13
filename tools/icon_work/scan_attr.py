
import os, re

ROOT = r"D:\Project\Starlight_Lancher"
DIRS = [
    "apps/app-frontend/src",
    "packages/ui/src",
    "packages/app-lib/src",
    "apps/app/src",
]
KEYWORDS = re.compile(
    r"Copyright|All Rights|Powered by|attribution|Attribution|"
    r"modified version|based on|版权所有|版权归|署名|致谢|鸣谢|"
    r"credit|Credit|acknowledg|Acknowledg",
    re.I,
)

hits = []
for d in DIRS:
    base = os.path.join(ROOT, d)
    if not os.path.isdir(base):
        continue
    for dp, dn, fn in os.walk(base):
        dn[:] = [x for x in dn if x not in ("node_modules", "dist", "target", ".git")]
        for f in fn:
            if not f.endswith((".ts", ".vue", ".rs", ".js", ".json")):
                continue
            p = os.path.join(dp, f)
            if "locales" in p and not p.endswith("en-US/index.json") and not p.endswith("zh-CN/index.json"):
                continue
            try:
                lines = open(p, encoding="utf-8").read().split("\n")
            except Exception:
                continue
            for i, line in enumerate(lines, 1):
                if "Starlight" in line and KEYWORDS.search(line):
                    hits.append((os.path.relpath(p, ROOT), i, line.strip()))

print(f"含版权/归属性质且提到 Starlight 的行：{len(hits)}\n")
for h in hits:
    print(f"{h[0]}:{h[1]}")
    print(f"    {h[2][:160]}")
