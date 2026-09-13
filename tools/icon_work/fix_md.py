
import re, os

ROOT = r"D:\Project\Starlight_Lancher"
FILES = [
    "CLAUDE.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "apps/app/README.md",
    "apps/telemetry-dashboard/README.md",
    "apps/telemetry-worker/README.md",
    "apps/website/CLAUDE.md",
    "apps/website/README.md",
    "packages/assets/README.md",
    "standards/README.md",
    "standards/frontend/INTERNATIONALIZATION.md",
    "apps/app-frontend/src/lab/recipe-generator/THIRD_PARTY_NOTICES.md",
]

SKIP_SUBSTR = [
    "axolotl:brand-guard", "axolotl:i18n-check", "axolotl-release", "axolotl-ci",
    "axolotl:brand", "//axolotl", "/axolotl/", "axolotl.local", "axolotl-launcher",
    "axolotl://", "garbage-human-studio", "red.ghs.axolotl",
    "github.com/Mystic-Stars/Axolotl",   # 保留 Axolotl 仓库 URL
    "Axolotl-Launcher",                   # 保留 GitHub 组织名
]

def transform(line):
    if any(s in line for s in SKIP_SUBSTR):
        return line
    out = re.sub(r"\bAxolotl Launcher\b", "Starlight Launcher", line)
    out = re.sub(r"\bAxolotl\b", "Starlight", out)
    return out

APPLY = True
report = []
for f in FILES:
    p = os.path.join(ROOT, f)
    try:
        text = open(p, encoding="utf-8").read()
    except Exception as e:
        print("跳过", f, e); continue
    lines = text.split("\n")
    changed = 0
    for i, line in enumerate(lines):
        new = transform(line)
        if new != line:
            report.append((f, i+1, line.strip(), new.strip()))
            lines[i] = new
            changed += 1
    if changed and APPLY:
        open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines))

print("已写入，受影响行数:", len(report))
for f, ln, old, new in report:
    print(f"{f}:{ln}  -> {new[:80]}")
