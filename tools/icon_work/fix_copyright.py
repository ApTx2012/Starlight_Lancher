
f1 = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\settings\AboutSettings.vue"
t1 = open(f1, encoding="utf-8").read()
old1 = "defaultMessage: 'Copyright © Starlight All Rights Reserved.',"
new1 = "defaultMessage: 'Copyright © Axolotl All Rights Reserved.',"
assert old1 in t1, "AboutSettings 找不到版权行"
t1 = t1.replace(old1, new1, 1)
open(f1, "w", encoding="utf-8", newline="\n").write(t1)

f2 = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\pages\Settings.vue"
t2 = open(f2, encoding="utf-8").read()
old2 = "Powered by Starlight"
new2 = "Powered by Axolotl"
assert old2 in t2, "Settings 找不到 Powered by 行"
t2 = t2.replace(old2, new2, 1)
open(f2, "w", encoding="utf-8", newline="\n").write(t2)

print("done")
print("AboutSettings:142 ->", new1)
print("Settings:379 ->", new2)
