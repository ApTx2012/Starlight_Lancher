
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\home\HomeLaunchProgress.vue"
t = open(p, encoding="utf-8").read()

# 1) 给最外层 section 加 v-if
t = t.replace(
    '\t<section\n\t\tclass="flex min-w-0 flex-col gap-3 border-0 border-b-[1px] border-solid border-[--brand-gradient-border] p-4"\n\t>',
    '\t<section\n\t\tv-if="hasProgress"\n\t\tclass="flex min-w-0 flex-col gap-3 border-0 border-b-[1px] border-solid border-[--brand-gradient-border] p-4"\n\t>',
)

# 2) 删空态 <p v-if="!hasProgress">...</p>
import re
t = re.sub(
    r'\t\t<p v-if="!hasProgress"[^>]*>\n\t\t\t\{\{ formatMessage\(messages\.empty\) \}\}\n\t\t</p>\n',
    "",
    t,
)

# 3) <ul v-else ...> 改 <ul ...>
t = t.replace('<ul v-else class="m-0 flex list-none flex-col gap-2 p-0">', '<ul class="m-0 flex list-none flex-col gap-2 p-0">')

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
print("--- 78-95 ---")
for i, line in enumerate(t.split("\n")[77:95], 78):
    print(f"{i}: {line}")
