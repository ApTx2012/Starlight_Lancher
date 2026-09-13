
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\AboutScene.vue"
t = open(p, encoding="utf-8").read()

# 1) 删 import 行
old_imp = "import { type GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js'\n"
assert old_imp in t, "import 行找不到"
t = t.replace(old_imp, "", 1)

# 2) 删 loadGLTF 函数（含前后空行）
old_fn = """function loadGLTF(url: string): Promise<GLTF> {
	return new Promise((res, rej) => {
		const loader = new GLTFLoader()
		loader.load(
			url,
			(data) => {
				res(data)
			},
			undefined,
			rej,
		)
	})
}

"""
assert old_fn in t, "loadGLTF 函数找不到"
t = t.replace(old_fn, "", 1)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
print("残留 GLTFLoader:", "GLTFLoader" in t)
print("残留 loadGLTF:", "loadGLTF" in t)
