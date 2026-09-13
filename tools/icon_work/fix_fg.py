
p = r"D:\Project\Starlight_Lancher\apps\app\src\lightweight_mode.rs"
t = open(p, encoding="utf-8").read()

# 1) import 加 SetForegroundWindow
old_import = """    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowThreadProcessId, IsWindowVisible, SW_MAXIMIZE, ShowWindow,
    };"""
new_import = """    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowThreadProcessId, IsWindowVisible, SW_MAXIMIZE, SetForegroundWindow, ShowWindow,
    };"""
assert old_import in t, "找不到 import 块"
t = t.replace(old_import, new_import, 1)

# 2) 最大化前先聚焦到前台
old_show = "        let _ = unsafe { ShowWindow(hwnd, SW_MAXIMIZE) };"
new_show = (
    "        let _ = unsafe { SetForegroundWindow(hwnd) };\n"
    "        let _ = unsafe { ShowWindow(hwnd, SW_MAXIMIZE) };"
)
assert old_show in t, "找不到 ShowWindow 行"
t = t.replace(old_show, new_show, 1)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
l = t.split("\n")
for i in range(354, 372):
    print(f"{i+1}: {l[i]}")
