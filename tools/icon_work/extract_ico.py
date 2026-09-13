
import struct

p = r"D:\Project\Starlight_Lancher\target\release\Starlight Launcher.exe"
data = open(p, "rb").read()

# 粗解析 PE，找 .rsrc 段的 RT_GROUP_ICON 和 RT_ICON
# 简化：直接找所有 PNG（现代 ico 用 png 存大图）和 BMP(ico用)
# 提取第一个 PNG 看尺寸
import io
PNG_SIG = b"\x89PNG\r\n\x1a\n"
results = []
idx = 0
while True:
    i = data.find(PNG_SIG, idx)
    if i < 0:
        break
    # PNG IHDR: 宽高在 sig 后 16 字节起 (8 sig + 4 len + 4 'IHDR' = 16)
    try:
        w = struct.unpack(">I", data[i+16:i+20])[0]
        h = struct.unpack(">I", data[i+20:i+24])[0]
        if 8 <= w <= 1024 and 8 <= h <= 1024:
            results.append((i, w, h))
    except Exception:
        pass
    idx = i + 8

print("找到疑似图标 PNG (offset,w,h) 前 30 个:")
for r in results[:30]:
    print(r)

# 对比：icon.ico 里各图像尺寸
ico = open(r"D:\Project\Starlight_Lancher\apps\app\icons\icon.ico", "rb").read()
n = struct.unpack("<H", ico[4:6])[0]
print(f"\nicon.ico 含 {n} 个图像:")
off = 6
for k in range(n):
    w = ico[off] or 256
    h = ico[off+1] or 256
    size = struct.unpack("<I", ico[off+8:off+12])[0]
    print(f"  图像{k}: {w}x{h}, {size} bytes")
    off += 16
