
l = open("packages/app-lib/src/launcher/mod.rs", encoding="utf-8").read().split("\n")
for i, line in enumerate(l):
    if "init_loading" in line or "emit_loading" in line or "MinecraftDownload" in line or "InstanceUpdate" in line:
        print(f"{i+1}: {line.strip()}")
