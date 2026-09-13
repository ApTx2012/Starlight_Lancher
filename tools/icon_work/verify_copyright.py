
a = open(r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\settings\AboutSettings.vue", encoding="utf-8").read()
b = open(r"D:\Project\Starlight_Lancher\apps\app-frontend\src\pages\Settings.vue", encoding="utf-8").read()
print("AboutSettings 含 Axolotl 版权:", "Copyright \u00a9 Axolotl All Rights Reserved." in a)
print("AboutSettings 还含 Starlight 版权:", "Copyright \u00a9 Starlight All Rights Reserved." in a)
print("Settings 含 Powered by Axolotl:", "Powered by Axolotl" in b)
print("Settings 还含 Powered by Starlight:", "Powered by Starlight" in b)
