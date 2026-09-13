
import json
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\package.json"
data = json.load(open(p, encoding="utf-8"))
old = data["version"]
data["version"] = "1.0.0-beta1"
open(p, "w", encoding="utf-8", newline="\n").write(json.dumps(data, ensure_ascii=False, indent="\t") + "\n")
print(f"version: {old} -> 1.0.0-beta1")
