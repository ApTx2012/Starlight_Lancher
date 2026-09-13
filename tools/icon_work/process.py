
from PIL import Image
import os

src = r"C:\Users\28579\Downloads\resources\resources\netherstar.png"
out_dir = r"D:\Project\Starlight_Lancher\tools\icon_work"
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src).convert("RGBA")
print("原图:", img.size)

alpha = img.getchannel("A")
bbox = alpha.getbbox()
print("内容 bbox:", bbox)
cropped = img.crop(bbox)
print("裁剪后:", cropped.size)

cw, ch = cropped.size

# 方案A: contain, 保比例居中
scale = 1024 / max(cw, ch)
nw, nh = round(cw*scale), round(ch*scale)
ra = cropped.resize((nw, nh), Image.LANCZOS)
ca = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
ca.paste(ra, ((1024-nw)//2, (1024-nh)//2), ra)
pa = os.path.join(out_dir, "square_contain.png")
ca.save(pa)
print("A contain:", pa, (nw, nh))

# 方案B: cover, 占满并裁切
sb = 1024 / min(cw, ch)
bw, bh = round(cw*sb), round(ch*sb)
rb = cropped.resize((bw, bh), Image.LANCZOS)
left, top = (bw-1024)//2, (bh-1024)//2
cb = rb.crop((left, top, left+1024, top+1024))
pb = os.path.join(out_dir, "square_cover.png")
cb.save(pb)
print("B cover:", pb, (bw, bh))
