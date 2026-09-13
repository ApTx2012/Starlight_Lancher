
p = r"D:\Project\Starlight_Lancher\apps\app\tauri.conf.json"
lines = open(p, encoding="utf-8").read().split("\n")
correct = '        "frame-src": "https://www.youtube.com https://www.youtube-nocookie.com https://discord.com \'self\' axolotl-skin://localhost http://axolotl-skin.localhost https://skin.starlight.cool",'
print("BEFORE 129-135:")
for i in range(128, 135):
    print(f"{i+1}: {lines[i]}")
# 合并 131-134 (idx 130..133) 为一行
lines[130:134] = [correct]
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("AFTER 128-135:")
for i in range(127, 135):
    print(f"{i+1}: {lines[i]}")
