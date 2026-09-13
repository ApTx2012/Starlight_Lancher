from PIL import Image
import numpy as np
from scipy import ndimage

src = r"C:\Users\28579\Downloads\resources\resources\netherstar.png"
dst = r"D:\Project\Starlight_Lancher\apps\app-frontend\public\models\netherstar.png"

im = Image.open(src).convert("RGBA")
arr = np.array(im, dtype=np.float32)
r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

# 1) 完全不透明像素的位置
opaque = a >= 254
# 2) 对每个通道，用最近的不透明像素值填充（距离变换的索引）
# 用一个临时：在 opaque 区域保留原 RGB，其余待填
h, w = a.shape
# 用 scipy 的 distance_transform_edt 拿到"最近的 opaque 像素索引"
indices = ndimage.distance_transform_edt(~opaque, return_distances=False, return_indices=True)
nearest_rgb = arr[indices[0], indices[1], :3]

# 3) 半透明区域（a < 254 且 a > 0）的 RGB 换成最近不透明像素颜色
semi = (a > 0) & (a < 254)
out = arr.copy()
out[semi, 0:3] = nearest_rgb[semi]

# 4) 可选：收紧极小 alpha（<8 直接透明），减少杂边
out[a < 8, 3] = 0

out_img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
out_img.save(dst)
print("done ->", dst)
print("尺寸:", out_img.size)