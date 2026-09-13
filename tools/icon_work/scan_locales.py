
import os, glob

ROOT = r"D:\Project\Starlight_Lancher"
LOCALES = os.path.join(ROOT, "apps", "app-frontend", "src", "locales")

KEYS = [
    "app.settings.about.copyright",
    "app.settings.about.attribution",
]

for path in sorted(glob.glob(os.path.join(LOCALES, "*", "index.json"))):
    lang = os.path.basename(os.path.dirname(path))
    try:
        lines = open(path, encoding="utf-8").read().split("\n")
    except Exception:
        continue
    for i, line in enumerate(lines):
        for key in KEYS:
            if f'"{key}"' in line:
                # 取下一行的 message
                msg = lines[i + 1].strip() if i + 1 < len(lines) else ""
                print(f"{lang} | {key}")
                print(f"    {msg[:150]}")
