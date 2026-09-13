
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\AboutScene.vue"
t = open(p, encoding="utf-8").read()

old = "\tlet updateGLTF = (_deltaTime: number, _elapsedTime: number) => {}"
new = """\t// 静止的下界之星（替换原动态美西螈）
\tconst starTexture = new THREE.TextureLoader().load('/models/netherstar.png')
\tstarTexture.colorSpace = THREE.SRGBColorSpace
\tconst starMaterial = new THREE.SpriteMaterial({ map: starTexture, transparent: true })
\tconst starSprite = new THREE.Sprite(starMaterial)
\tstarSprite.scale.set(8, 8, 1)
\tstarSprite.position.set(0, -2.5, 0)
\tscene.add(starSprite)

\tlet updateGLTF = (_deltaTime: number, _elapsedTime: number) => {}"""

assert old in t, "找不到 updateGLTF 空行"
t = t.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
