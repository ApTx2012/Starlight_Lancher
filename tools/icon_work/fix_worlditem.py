
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\world\WorldItem.vue"
t = open(p, encoding="utf-8").read()

# 1) 删 protectedServer 定义
old_def = """const protectedServer = computed(
	() => props.world.type === 'server' && props.world.address === PROTECTED_SERVER_ADDRESS,
)
"""
assert old_def in t, "protectedServer 定义找不到"
t = t.replace(old_def, "", 1)

# 2) import 去掉 PROTECTED_SERVER_ADDRESS
t = t.replace("\tPROTECTED_SERVER_ADDRESS,\n", "", 1)

# 3) 逻辑里去掉 protectedServer
t = t.replace("shown: !instanceId && !protectedServer,", "shown: !instanceId,", 1)  # edit
t = t.replace("disabled: locked || managed || protectedServer,", "disabled: locked || managed,", 1)  # edit
t = t.replace("shown: !!homePinTarget && !protectedServer,", "shown: !!homePinTarget,", 1)  # pin
t = t.replace("shown: !instanceId && !protectedServer,", "shown: !instanceId,", 1)  # delete
t = t.replace("disabled: locked || managed || protectedServer,", "disabled: locked || managed,", 1)  # delete

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("WorldItem done")
print("  残留 protectedServer:", "protectedServer" in t)
print("  残留 PROTECTED_SERVER:", "PROTECTED_SERVER" in t)
