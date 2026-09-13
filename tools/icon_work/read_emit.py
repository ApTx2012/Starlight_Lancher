
import glob
for f in glob.glob("packages/app-lib/src/event/*.rs"):
    print("=== " + f + " ===")
    print(open(f, encoding="utf-8").read()[:4000])
    print()
