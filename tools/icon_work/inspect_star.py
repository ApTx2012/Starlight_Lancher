from PIL import Image
im = Image.open(r"C:\Users\28579\Downloads\resources\resources\netherstar.png").convert("RGBA")
w, h = im.size
# 找 alpha 从 0 到 255 的过渡带，看这些像素的 RGB
print("=== 半透明白色像素采样 ===")
cnt = 0
for y in range(0, h, 5):
    for x in range(0, w, 5):
        r, g, b, a = im.getpixel((x, y))
        if 0 < a < 255 and r > 240 and g > 240 and b > 240:
            print(f"({x},{y}) RGBA=({r},{g},{b},{a})")
            cnt += 1
            if cnt >= 10:
                break
    if cnt >= 10:
        break
# 对比：全不透明像素的 RGB
print("\n=== 不透明像素采样 ===")
cnt = 0
for y in range(0, h, 5):
    for x in range(0, w, 5):
        r, g, b, a = im.getpixel((x, y))
        if a == 255:
            print(f"({x},{y}) RGBA=({r},{g},{b},{a})")
            cnt += 1
            if cnt >= 5:
                break
    if cnt >= 5:
        break