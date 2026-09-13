from PIL import Image
im = Image.open(r"C:\Users\28579\Downloads\resources\resources\netherstar.png")
print("模式:", im.mode)
print("尺寸:", im.size)
print("有 alpha:", im.mode in ("RGBA", "LA"))
if im.mode in ("RGBA", "LA"):
    a = im.getchannel("A")
    print("alpha bbox:", a.getbbox())
    print("alpha 范围:", a.getextrema())
    # 采样角落像素，看是不是白/透明
    w, h = im.size
    print("左上角:", im.getpixel((0, 0)))
    print("中心:", im.getpixel((w // 2, h // 2)))