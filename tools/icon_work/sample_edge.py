from PIL import Image
im = Image.open(r"C:\Users\28579\Downloads\resources\resources\netherstar.png").convert("RGBA")
w, h = im.size
print("尺寸:", (w, h))
# 采样边缘一圈（alpha 低但 RGB 接近白的像素 = "脏"边缘）
dirty = 0
total_edge = 0
for y in range(0, h, 3):
    for x in range(0, w, 3):
        r, g, b, a = im.getpixel((x, y))
        if 0 < a < 255:
            total_edge += 1
            # alpha 半透明，但 RGB 很亮（接近白）—— 这就是"没剔干净"的迹象
            if r > 240 and g > 240 and b > 240:
                dirty += 1
print("半透明像素总数:", total_edge)
print("半透明中 RGB 接近白的（脏边缘）:", dirty)
if total_edge:
    print("脏边比例: {:.1f}%".format(dirty / total_edge * 100))