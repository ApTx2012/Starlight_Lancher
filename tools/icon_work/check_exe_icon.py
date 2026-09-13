
p = r"D:\Project\Starlight_Lancher\target\release\Starlight Launcher.exe"
data = open(p, "rb").read()
print("exe 大小:", len(data))
print("内嵌 PNG 数量(粗估):", data.count(b"\x89PNG\r\n\x1a\n"))
ico = open(r"D:\Project\Starlight_Lancher\apps\app\icons\icon.ico", "rb").read()
print("icon.ico 大小:", len(ico))
print("icon.ico 原样出现在 exe:", ico in data)
