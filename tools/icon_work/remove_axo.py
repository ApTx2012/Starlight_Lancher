
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\AboutScene.vue"
t = open(p, encoding="utf-8").read()

old = """	async function load() {
		const axlGLTF = await loadGLTF('/models/axolotl.gltf')

		const axlModel = axlGLTF.scene
		axlModel.scale.multiplyScalar(5)
		axlModel.rotateY(Math.PI / 2)
		axlModel.position.add(new THREE.Vector3(0, -2.5, 0))
		scene.add(axlModel)

		const mixer = new THREE.AnimationMixer(axlModel)
		const axlSwimAnim = axlGLTF.animations.filter((a) => a.name === 'swim')[0]
		if (!axlSwimAnim) return console.error('Missing animation swim')
		mixer.clipAction(axlSwimAnim).play()

		// // Axl Label
		// const axlLabelGLTF = await loadGLTF('/models/axl_label.glb')
		// const axlLabel = axlLabelGLTF.scene
		// axlLabel.scale.multiplyScalar(8)
		// axlLabel.rotateY(-Math.PI / 2)
		// axlLabel.position.set(0, 5.2, 0)
		// scene.add(axlLabel)

		const originAxlModelPosition = axlModel.position.clone()
		return function (deltaTime: number, elapsedTime: number) {
			axlModel.position.set(
				originAxlModelPosition.x,
				originAxlModelPosition.y + Math.sin(elapsedTime),
				originAxlModelPosition.z,
			)
			axlModel.rotation.y = Math.sin(elapsedTime * 0.3) * 0.2 + (Math.PI * 100) / 180
			mixer.update(deltaTime)
		}
	}
	let updateGLTF = (_deltaTime: number, _elapsedTime: number) => {}
	load().then((updateFn) => {
		if (updateFn) updateGLTF = updateFn
	})"""

new = """	let updateGLTF = (_deltaTime: number, _elapsedTime: number) => {}"""

assert old in t, "找不到美西螈加载块"
t = t.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
