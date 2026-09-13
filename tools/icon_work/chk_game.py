
t = open(r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\AboutEasterEgg.vue", encoding="utf-8").read()
print("含 </script>:", "</script>" in t)
print("含 drawAxolotl:", "drawAxolotl" in t)
print("含 axolotl-balls import:", "axolotl-balls" in t)
print("行数:", len(t.split("\n")))
print("末 120 字:", repr(t[-120:]))
