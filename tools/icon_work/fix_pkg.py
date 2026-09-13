
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\package.json"
t = open(p, encoding="utf-8").read()

# 1) build 去掉 contributors:sync
t = t.replace(
    '"build": "pnpm contributors:sync && vue-tsc --noEmit && vite build",',
    '"build": "vue-tsc --noEmit && vite build",',
)
# 2) 删除 contributors:sync 那一行
t = t.replace(
    '\t\t"contributors:sync": "node ../../scripts/axolotl/sync-contributors.mjs",\n',
    "",
)
open(p, "w", encoding="utf-8", newline="\n").write(t)

import json
json.load(open(p, encoding="utf-8"))  # 校验合法
print("done")
l = t.split("\n")
for i in range(5, 13):
    print(f"{i+1}: {l[i]}")
