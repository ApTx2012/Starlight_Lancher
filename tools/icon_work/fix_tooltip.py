p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\App.vue"
t = open(p, encoding="utf-8").read()

# 1) 加 import（放在 App.vue 的 import 区，紧跟其他 @ 包；找一个锚点）
anchor = "import { listen } from '@tauri-apps/api/event'"
assert anchor in t, "找不到 anchor import"
t = t.replace(anchor, "import { hideAllPoppers } from 'floating-vue'\n" + anchor, 1)

# 2) router.afterEach 开头加 hideAllPoppers()
old = "router.afterEach((to, from, failure) => {\n\tif (!failure) void invoke('lightweight_mode_set_route', { route: to.fullPath })"
new = "router.afterEach((to, from, failure) => {\n\thideAllPoppers()\n\tif (!failure) void invoke('lightweight_mode_set_route', { route: to.fullPath })"
assert old in t, "找不到 router.afterEach 开头"
t = t.replace(old, new, 1)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
print("  含 hideAllPoppers import:", "import { hideAllPoppers } from 'floating-vue'" in t)
print("  调用次数:", t.count("hideAllPoppers()"))