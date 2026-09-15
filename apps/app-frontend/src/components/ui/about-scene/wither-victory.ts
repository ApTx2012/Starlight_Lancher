import cloudTextureUrl from '@/assets/about-scene/clouds.png'
import moonTextureUrl from '@/assets/about-scene/moon-phases.png'
import swordTextureUrl from '@/assets/about-scene/netherite-sword.png'
import cleanUrl from '@/assets/about-scene/victory-clean.jpg'
import originalUrl from '@/assets/about-scene/victory-master.jpg'
import correctedPoseUrl from '@/assets/about-scene/victory-pose.jpg'
import removedBeamsUrl from '@/assets/about-scene/wither-beams-removed.png'
import rebuiltWitherUrl from '@/assets/about-scene/wither-shoulder-cleanup.png'

import { witherShieldSurfaces } from './wither-shield'

type Point = [number, number]
type Vertex = [number, number, number]

/** The approved artwork and item geometry are kept separate from the animation lifecycle. */
export function createWitherVictoryScene(canvas: HTMLCanvasElement) {
	const context = canvas.getContext('2d')
	if (!context) throw new Error('Unable to initialize about-page canvas')
	const ctx = context
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
	const original = new Image()
	const clean = new Image()
	const correctedPose = new Image()
	const rebuiltWither = new Image()
	const removedBeams = new Image()
	const swordTexture = new Image()
	const cloudTexture = new Image()
	const moonTexture = new Image()
	const W = 2048,
		H = W / 3,
		artworkWidth = 2172,
		artworkHeight = 724,
		artworkScale = artworkWidth / W,
		TAU = Math.PI * 2
	let time = 0,
		last = 0,
		paused = false,
		visible = false,
		ready = false
	let frame = 0,
		destroyed = false
	const makeLayer = (w = W, h = H) => {
		const layer = document.createElement('canvas')
		layer.width = Math.ceil(w)
		layer.height = Math.ceil(h)
		return layer
	}
	const base = makeLayer(artworkWidth, artworkHeight)
	const shield = makeLayer(artworkWidth, artworkHeight)
	const star = makeLayer(180, 180)
	const starFace = makeLayer(180, 180)
	const swordFace = makeLayer(128, 128)
	const grippingFingers = makeLayer(64, 80)
	let cloudField: ReturnType<typeof makeVanillaCloudField>
	const buriedBlade: Point[] = [
		[1088, 526],
		[1099, 505],
		[1105, 491],
		[1116, 490],
		[1124, 483],
		[1133, 485],
		[1142, 478],
		[1158, 477],
		[1195, 480],
		[1212, 534],
		[1169, 567],
		[1101, 555],
	]
	const wound: Point[] = [
		[1104, 507],
		[1116, 490],
		[1136, 490],
		[1140, 480],
		[1156, 477],
		[1178, 479],
		[1173, 493],
		[1157, 505],
		[1152, 524],
		[1137, 534],
		[1126, 523],
	]
	const starRows = [
		'....p....',
		'...pwp...',
		'..pwYwp..',
		'.pwYIYwp.',
		'pwYISIYwp',
		'.pwYIYwp.',
		'..pwYwp..',
		'...pwp...',
		'....p....',
	]
	const starColors: Record<string, string> = {
		p: '#b692d0',
		w: '#f8e6cf',
		Y: '#ffe3a0',
		I: '#fff6da',
		S: '#fffef1',
	}
	// Irregular failing-lamp events: brief reignitions, weak sputters, and dark gaps.
	const shieldEvents = [
		[0, 0.68, 0.48],
		[0.87, 0.09, 0.82],
		[1.05, 0.16, 0.27],
		[1.39, 0.08, 0.61],
		[2.7, 0.42, 0.2],
		[3.27, 0.13, 0.65],
		[4.8, 0.82, 0.42],
		[5.83, 0.06, 0.82],
		[6.08, 0.13, 0.29],
		[6.39, 0.09, 0.7],
		[8.15, 0.53, 0.26],
		[9.64, 0.12, 0.69],
		[9.88, 0.19, 0.34],
		[10.2, 0.08, 0.73],
		[11.75, 0.7, 0.45],
		[12.8, 0.07, 0.87],
		[13.14, 0.1, 0.24],
		[15.02, 0.28, 0.5],
		[15.58, 0.09, 0.86],
		[15.82, 0.13, 0.31],
		[17.5, 0.84, 0.22],
		[18.63, 0.08, 0.68],
		[18.85, 0.18, 0.39],
		[20.25, 0.56, 0.53],
		[21.13, 0.1, 0.86],
		[21.36, 0.12, 0.35],
		[22.17, 0.29, 0.18],
	]
	const rand = (n: number) => {
		const v = Math.sin(n * 127.1 + 311.7) * 43758.5453
		return v - Math.floor(v)
	}
	const sparks = Array.from({ length: 34 }, (_, i) => ({
		seed: i,
		phase: rand(i),
		life: 6,
		size: 2 + rand(i + 9) * 5,
	}))
	const dust = Array.from({ length: 56 }, (_, i) => ({
		seed: i + 80,
		phase: rand(i + 31),
		life: 6 + rand(i + 42) * 5,
		size: 4 + rand(i + 64) * 7,
	}))
	const armor: Point[][] = [
		[
			[655, 22],
			[809, 72],
			[885, 81],
			[858, 132],
			[773, 119],
			[690, 132],
			[651, 112],
		],
		[
			[693, 214],
			[768, 223],
			[805, 385],
			[727, 398],
			[712, 301],
		],
		[
			[627, 157],
			[670, 171],
			[649, 237],
			[596, 221],
		],
		[
			[877, 183],
			[918, 210],
			[899, 244],
			[865, 224],
		],
	]
	function path(points: Point[]) {
		ctx.beginPath()
		points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
		ctx.closePath()
	}
	function glow(x: number, y: number, r: number, color: string, alpha: number) {
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
		gradient.addColorStop(0, `rgba(${color},${alpha})`)
		gradient.addColorStop(0.35, `rgba(${color},${alpha * 0.36})`)
		gradient.addColorStop(1, `rgba(${color},0)`)
		ctx.fillStyle = gradient
		ctx.fillRect(x - r, y - r, r * 2, r * 2)
	}
	function prepare() {
		// Restore the sharp master for all unaffected materials, anatomy and terrain.
		const b = base.getContext('2d')!
		b.setTransform(artworkScale, 0, 0, artworkScale, 0, 0)
		b.imageSmoothingEnabled = false
		b.drawImage(original, 0, 0, W, H)
		const sky = makeLayer(artworkWidth, artworkHeight),
			skyCtx = sky.getContext('2d')!
		skyCtx.setTransform(artworkScale, 0, 0, artworkScale, 0, 0)
		skyCtx.drawImage(clean, 0, 0, W, H)
		skyCtx.globalCompositeOperation = 'destination-in'
		const skyFade = skyCtx.createLinearGradient(0, 409, 0, 448)
		skyFade.addColorStop(0, '#fff')
		skyFade.addColorStop(1, 'transparent')
		skyCtx.fillStyle = skyFade
		skyCtx.fillRect(0, 0, W, 442)
		b.drawImage(sky, 0, 0, W, H)
		const restore = (source: HTMLImageElement, polygon: Point[]) => {
			b.save()
			b.beginPath()
			polygon.forEach((p, i) => (i ? b.lineTo(...p) : b.moveTo(...p)))
			b.closePath()
			b.clip()
			if (source === correctedPose)
				b.drawImage(source, (583 * W) / 2172, (212 * W) / 2172, (510 * W) / 2172, (477 * W) / 2172)
			else b.drawImage(source, 0, 0, W, H)
			b.restore()
		}
		// Crisp original character; only previously corrected hands/boots use their local plate.
		restore(original, [
			[687, 8],
			[906, 81],
			[884, 173],
			[919, 183],
			[923, 209],
			[876, 242],
			[854, 273],
			[862, 314],
			[918, 308],
			[938, 385],
			[950, 424],
			[930, 480],
			[817, 480],
			[805, 399],
			[747, 399],
			[720, 491],
			[627, 502],
			[651, 423],
			[625, 452],
			[590, 437],
			[574, 410],
			[594, 386],
			[572, 374],
			[577, 341],
			[574, 331],
			[593, 270],
			[605, 237],
			[588, 237],
			[607, 159],
			[650, 139],
		])
		// Remove the baked angled moon locally with matching moon-free sky.
		// The new vanilla moon is a separate, camera-facing layer.
		const moonSky = makeLayer(280, 270),
			ms = moonSky.getContext('2d')!
		ms.drawImage(
			clean,
			0,
			0,
			(280 * clean.naturalWidth) / W,
			(270 * clean.naturalHeight) / H,
			0,
			0,
			280,
			270,
		)
		ms.globalCompositeOperation = 'destination-in'
		ms.save()
		ms.translate(140, 130)
		ms.scale(1, 1.13)
		const moonMask = ms.createRadialGradient(0, 0, 80, 0, 0, 123)
		moonMask.addColorStop(0, '#fff')
		moonMask.addColorStop(1, 'transparent')
		ms.fillStyle = moonMask
		ms.fillRect(-140, -135, 280, 270)
		ms.restore()
		b.drawImage(moonSky, 193, -20)
		// Restore the sharp skull planes covered by the sky plate.
		restore(original, [
			[1159, 355],
			[1318, 352],
			[1358, 421],
			[1315, 498],
			[1246, 474],
			[1107, 443],
		])
		// Remove the old painted blade without resampling the rest of the creature.
		restore(clean, [
			[975, 339],
			[1002, 334],
			[1078, 369],
			[1148, 456],
			[1185, 469],
			[1200, 481],
			[1178, 520],
			[1144, 562],
			[1080, 570],
			[1025, 548],
			[1053, 502],
			[1006, 476],
		])
		// Retain the previously approved removal of baked lightning below the skulls.
		restore(clean, [
			[900, 595],
			[948, 572],
			[1000, 588],
			[982, 615],
			[914, 630],
			[877, 625],
		])
		restore(clean, [
			[1380, 420],
			[1428, 430],
			[1400, 492],
			[1375, 535],
			[1356, 606],
			[1377, 626],
			[1294, 639],
			[1284, 579],
			[1318, 525],
			[1320, 470],
		])
		// Use regeneration only to erase the two unwanted shoulder slabs. The skulls,
		// ribs, character and background retain their original sharp source pixels.
		restore(rebuiltWither, [
			[963, 423],
			[1014, 417],
			[1049, 431],
			[1074, 479],
			[1066, 495],
			[1017, 511],
			[985, 524],
			[963, 466],
		])
		restore(rebuiltWither, [
			[1360, 415],
			[1392, 414],
			[1429, 427],
			[1448, 445],
			[1405, 506],
			[1398, 532],
			[1355, 528],
			[1319, 514],
			[1324, 494],
		])
		// Replace only the removed beam silhouettes with the newly exposed background.
		// No full-frame regeneration or feathering: unaffected source pixels stay intact.
		restore(removedBeams, [
			[976, 480],
			[1146, 462],
			[1152, 488],
			[1124, 508],
			[999, 530],
			[990, 542],
		])
		restore(removedBeams, [
			[1294, 489],
			[1404, 498],
			[1445, 548],
			[1452, 629],
			[1402, 621],
			[1305, 615],
			[1299, 549],
			[1283, 521],
		])
		restore(correctedPose, [
			[811, 377],
			[951, 377],
			[975, 415],
			[987, 481],
			[952, 496],
			[813, 486],
		])
		restore(correctedPose, [
			[591, 486],
			[744, 495],
			[757, 650],
			[550, 650],
			[565, 553],
		])
		restore(correctedPose, [
			[880, 210],
			[925, 218],
			[951, 235],
			[977, 245],
			[979, 280],
			[957, 302],
			[932, 299],
			[910, 280],
			[877, 267],
		])
		try {
			cloudField = makeVanillaCloudField()
		} catch (error) {
			console.warn('Unable to initialize about-page clouds', error)
		}
		// Occlude with skin pixels only: background in the palm must not erase the grip.
		const fingers = grippingFingers.getContext('2d')!
		fingers.drawImage(
			clean,
			(922 * clean.naturalWidth) / W,
			(228 * clean.naturalHeight) / H,
			(64 * clean.naturalWidth) / W,
			(80 * clean.naturalHeight) / H,
			0,
			0,
			64,
			80,
		)
		const skin = fingers.getImageData(0, 0, 64, 80)
		for (let pixel = 0; pixel < skin.data.length; pixel += 4) {
			const [red, green, blue] = skin.data.subarray(pixel, pixel + 3)
			if (red < 90 || green < 48 || red < green * 1.04 || green < blue * 1.08)
				skin.data[pixel + 3] = 0
		}
		fingers.putImageData(skin, 0, 0)
		// A small extruded item sprite retains sharp pixels during its vertical-axis turn.
		const s = star.getContext('2d')!
		starRows.forEach((row, y) =>
			[...row].forEach((v, x) => {
				if (v !== '.') {
					s.fillStyle = starColors[v]
					s.fillRect(x * 20, y * 20, 20, 20)
				}
			}),
		)
	}
	function enchantedFace(
		target: HTMLCanvasElement,
		texture: CanvasImageSource,
		t: number,
		strength: number,
	) {
		const c = target.getContext('2d')!,
			size = target.width
		c.clearRect(0, 0, size, size)
		c.imageSmoothingEnabled = false
		c.globalCompositeOperation = 'source-over'
		c.drawImage(texture, 0, 0, size, size)
		c.globalCompositeOperation = 'source-atop'
		c.fillStyle = `rgba(123,63,207,${strength * 0.14})`
		c.fillRect(0, 0, size, size)
		// Translation of glint only: the texture coordinates and geometry never change.
		const shift = ((t / 6) % 1) * size * 1.25
		for (let band = -2; band < 3; band++) {
			const x = shift + band * size * 1.25
			const g = c.createLinearGradient(x - size * 0.7, 0, x + size * 0.3, size)
			g.addColorStop(0, 'rgba(135,72,236,0)')
			g.addColorStop(0.34, 'rgba(135,72,236,0)')
			g.addColorStop(0.46, `rgba(163,99,247,${strength * 0.6})`)
			g.addColorStop(0.5, `rgba(224,178,255,${strength})`)
			g.addColorStop(0.55, `rgba(151,81,244,${strength * 0.5})`)
			g.addColorStop(0.66, 'rgba(135,72,236,0)')
			g.addColorStop(1, 'rgba(135,72,236,0)')
			c.fillStyle = g
			c.fillRect(0, 0, size, size)
		}
		c.globalCompositeOperation = 'source-over'
		return target
	}
	function drawSword(t: number) {
		const face = enchantedFace(swordFace, swordTexture, t, 0.34)
		ctx.save()
		// Hide only the buried sword pixels; never paint a base-image patch over the shield.
		ctx.beginPath()
		ctx.rect(0, 0, W, H)
		buriedBlade.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
		ctx.closePath()
		ctx.clip('evenodd')
		// Original 128x128 asset is rigidly rotated/scaled, with no mesh warp or repainting.
		// Place the grip's actual texture center inside the corrected curled palm.
		ctx.translate(938, 268)
		ctx.rotate((95.5 * Math.PI) / 180)
		ctx.scale(2.12, 2.12)
		ctx.imageSmoothingEnabled = false
		ctx.save()
		ctx.translate(1.25, 1.25)
		ctx.filter = 'brightness(.55)'
		ctx.drawImage(swordTexture, -24, -104, 128, 128)
		ctx.restore()
		ctx.drawImage(face, -24, -104, 128, 128)
		ctx.restore()
		// The fingers occlude the handle so it remains held, rather than pasted over the hand.
		ctx.drawImage(grippingFingers, 922, 228)
	}
	function drawStar(t: number, angle: number, x: number, y: number) {
		const front = enchantedFace(starFace, star, t, 0.23)
		const cosine = Math.cos(angle),
			sine = Math.sin(angle),
			halfDepth = 5
		ctx.save()
		ctx.translate(x, y)
		ctx.imageSmoothingEnabled = false
		// One native item-texel layer of thickness; keep the front's pixel silhouette intact.
		const edge = sine > 0 ? -1 : 1
		for (let row = 0; row < 9; row++)
			for (let col = 0; col < 9; col++) {
				const color = starRows[row][col]
				if (color === '.') continue
				const neighbor = starRows[row][col + edge]
				if (neighbor && neighbor !== '.') continue
				const px = ((col + (edge > 0 ? 1 : 0)) / 9 - 0.5) * 160,
					py = (row / 9 - 0.5) * 160
				const a = px * cosine - halfDepth * sine,
					b = px * cosine + halfDepth * sine
				ctx.fillStyle = color === 'p' ? '#9070b0' : '#d9af67'
				ctx.beginPath()
				ctx.moveTo(a, py)
				ctx.lineTo(b, py)
				ctx.lineTo(b, py + 160 / 9)
				ctx.lineTo(a, py + 160 / 9)
				ctx.closePath()
				ctx.fill()
			}
		ctx.translate(Math.sign(cosine) * halfDepth * sine, 0)
		ctx.scale(cosine, 1)
		ctx.filter = 'brightness(1.04)'
		ctx.shadowColor = '#ffdc98'
		ctx.shadowBlur = 9
		ctx.drawImage(front, -80, -80, 160, 160)
		ctx.restore()
	}
	function shieldLevel(t: number) {
		let level = 0
		for (const [start, duration, power] of shieldEvents) {
			const p = (t - start) / duration
			if (p >= 0 && p < 1) {
				const envelope = Math.min(1, p * 14, (1 - p) * 10)
				const sputter = 0.64 + 0.36 * rand(Math.floor(t * 19) + start * 91)
				level = Math.max(level, power * envelope * sputter)
			}
		}
		return level
	}
	function makeVanillaCloudField() {
		// Minecraft 1.20.6's unmodified clouds.png supplies every occupied cell.
		// One texel is a 12 x 12 block footprint with the vanilla 4-block thickness.
		const textureCanvas = makeLayer(256, 256),
			tc = textureCanvas.getContext('2d')!
		tc.drawImage(cloudTexture, 0, 0)
		const pixels = tc.getImageData(0, 0, 256, 256).data
		const occupied = (x: number, z: number) =>
			pixels[(((z + 256) % 256) * 256 + ((x + 256) % 256)) * 4 + 3] > 127
		const layer = makeLayer()
		const context = layer.getContext('webgl', {
			alpha: true,
			antialias: true,
			premultipliedAlpha: true,
		})
		if (!context) return
		const gl = context
		const vertices: number[] = []
		const quad = (a: Vertex, b: Vertex, c: Vertex, d: Vertex, shade: number) => {
			for (const point of [a, b, c, a, c, d]) vertices.push(...point, shade)
		}
		for (let z = 8; z < 96; z++)
			for (let x = 0; x < 256; x++) {
				if (!occupied(x, z + 36)) continue
				const l = (x - 128) * 12,
					r = l + 12,
					n = z * 12,
					f = n + 12,
					y = 84,
					h = y + 4
				quad([l, y, n], [r, y, n], [r, y, f], [l, y, f], 0.7)
				if (!occupied(x - 1, z + 36)) quad([l, y, n], [l, y, f], [l, h, f], [l, h, n], 0.9)
				if (!occupied(x + 1, z + 36)) quad([r, y, f], [r, y, n], [r, h, n], [r, h, f], 0.9)
				if (!occupied(x, z + 35)) quad([r, y, n], [l, y, n], [l, h, n], [r, h, n], 0.8)
				if (!occupied(x, z + 37)) quad([l, y, f], [r, y, f], [r, h, f], [l, h, f], 0.8)
			}
		const shader = (kind: number, source: string) => {
			const result = gl.createShader(kind)
			if (!result) throw new Error('Unable to allocate cloud shader')
			gl.shaderSource(result, source)
			gl.compileShader(result)
			if (!gl.getShaderParameter(result, gl.COMPILE_STATUS))
				throw new Error(gl.getShaderInfoLog(result) ?? 'Cloud shader compilation failed')
			return result
		}
		const vertex = shader(
			gl.VERTEX_SHADER,
			`
      attribute vec4 vertex; uniform float offset;
      varying float shade; varying float distance;
      void main(){
        vec3 p=vertex.xyz+vec3(offset,0.0,0.0);
        float focal=650.0; float horizon=350.0;
        gl_Position=vec4(2.0*focal*p.x/2048.0,
          (1.0-2.0*horizon/682.6667)*p.z+2.0*focal*p.y/682.6667,
          1.020202*p.z-28.282828,p.z);
        shade=vertex.w; distance=p.z;
      }
    `,
		)
		const fragment = shader(
			gl.FRAGMENT_SHADER,
			`
      precision mediump float; varying float shade; varying float distance;
      void main(){
        float alpha=.70*(1.0-smoothstep(480.0,1150.0,distance));
        gl_FragColor=vec4(vec3(.34,.40,.50)*shade*alpha,alpha);
      }
    `,
		)
		const program = gl.createProgram()
		if (!program) throw new Error('Unable to allocate cloud program')
		gl.attachShader(program, vertex)
		gl.attachShader(program, fragment)
		gl.linkProgram(program)
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			throw new Error(gl.getProgramInfoLog(program) ?? 'Cloud program linking failed')
		gl.useProgram(program)
		const buffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
		const attribute = gl.getAttribLocation(program, 'vertex')
		gl.enableVertexAttribArray(attribute)
		gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 16, 0)
		const offset = gl.getUniformLocation(program, 'offset')
		gl.enable(gl.DEPTH_TEST)
		gl.disable(gl.BLEND)
		gl.clearColor(0, 0, 0, 0)
		gl.viewport(0, 0, layer.width, layer.height)
		return {
			draw(elapsed: number) {
				if (gl.isContextLost()) return
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
				const travel = (elapsed * 2.4) % 3072
				for (const tile of [-3072, 0, 3072]) {
					gl.uniform1f(offset, tile + travel)
					gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4)
				}
				return layer
			},
			resize(width: number, height: number) {
				layer.width = width
				layer.height = height
				gl.viewport(0, 0, width, height)
			},
			dispose() {
				gl.deleteBuffer(buffer)
				gl.deleteProgram(program)
				gl.deleteShader(vertex)
				gl.deleteShader(fragment)
				gl.getExtension('WEBGL_lose_context')?.loseContext()
			},
		}
	}
	function drawShield(t: number) {
		const level = shieldLevel(t)
		canvas.dataset.shieldIntensity = level.toFixed(3)
		if (level < 0.003) return
		const surface = shield.getContext('2d')!
		surface.setTransform(artworkScale, 0, 0, artworkScale, 0, 0)
		surface.clearRect(0, 0, W, H + 1)
		surface.save()
		surface.globalCompositeOperation = 'source-over'
		const trace = (points: Point[]) => {
			surface.beginPath()
			points.forEach((p, i) => (i ? surface.lineTo(...p) : surface.moveTo(...p)))
			surface.closePath()
		}
		// Tight fractured-cavity contour: blue armor remains on the surrounding ribs.
		surface.beginPath()
		surface.rect(0, 0, W, H)
		wound.forEach((p, i) => (i ? surface.lineTo(p[0], p[1]) : surface.moveTo(p[0], p[1])))
		surface.closePath()
		surface.clip('evenodd')
		witherShieldSurfaces.forEach(({ plane: quad, outline = quad, shade = 1 }, index) => {
			const map = (u: number, v: number): Point => [
				(1 - v) * ((1 - u) * quad[0][0] + u * quad[1][0]) +
					v * ((1 - u) * quad[3][0] + u * quad[2][0]),
				(1 - v) * ((1 - u) * quad[0][1] + u * quad[1][1]) +
					v * ((1 - u) * quad[3][1] + u * quad[2][1]),
			]
			const alpha = level * shade * (0.79 + 0.21 * rand(index + Math.floor(t * 7)))
			trace(outline)
			surface.fillStyle = `rgba(55,126,203,${alpha * 0.38})`
			surface.fill()
			surface.save()
			trace(outline)
			surface.clip()
			for (let row = 0; row < 8; row++)
				for (let col = 0; col < 8; col++) {
					const grain = rand(row * 17 + col * 5 + index * 139)
					if (grain < 0.56) continue
					trace([
						map(col / 8, row / 8),
						map((col + 1) / 8, row / 8),
						map((col + 1) / 8, (row + 1) / 8),
						map(col / 8, (row + 1) / 8),
					])
					surface.fillStyle = `rgba(104,167,223,${alpha * (grain - 0.4) * 0.42})`
					surface.fill()
				}
			// Stepped translucent bands wrap each actual surface, like the supplied armor image.
			for (let band = -1; band < 3; band++)
				for (let col = 0; col < 8; col++) {
					const v = band * 0.48 + (t / 24) * 0.48 + Math.floor(rand(col + index * 11) * 3) / 32
					const height = 0.034 + rand(col * 3 + band + index) * 0.022
					trace([
						map(col / 8, v),
						map((col + 1) / 8, v),
						map((col + 1) / 8, v + height),
						map(col / 8, v + height),
					])
					surface.fillStyle = `rgba(210,229,172,${alpha * 0.75})`
					surface.fill()
				}
			surface.restore()
		})
		surface.restore()
		// Composite the fitted faces once, without bright overlaps at shared bone edges.
		ctx.save()
		ctx.globalCompositeOperation = 'screen'
		ctx.drawImage(shield, 0, 0, W, H)
		ctx.restore()
	}
	function drawClouds(elapsed: number) {
		ctx.save()
		// Clouds pass behind the character silhouette, never across the face or armor.
		ctx.beginPath()
		ctx.rect(0, 0, W, H)
		;[
			[687, 7],
			[907, 80],
			[884, 175],
			[918, 182],
			[921, 208],
			[980, 246],
			[980, 299],
			[945, 306],
			[899, 280],
			[864, 260],
			[861, 325],
			[573, 325],
			[594, 241],
			[588, 238],
			[607, 159],
			[650, 139],
		].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
		ctx.closePath()
		ctx.clip('evenodd')
		const clouds = cloudField?.draw(elapsed)
		if (clouds) ctx.drawImage(clouds, 0, 0, W, H)
		ctx.restore()
		canvas.dataset.cloudOffset = (elapsed * 2.4).toFixed(2)
	}
	function drawMoon() {
		ctx.save()
		ctx.globalCompositeOperation = 'screen'
		ctx.imageSmoothingEnabled = false
		ctx.filter = 'brightness(2.15)'
		// Vanilla waning-crescent tile, rendered square-on with no skew or side extrusion.
		// Retain its original pixel shading and native halo; black texels add no light.
		ctx.drawImage(moonTexture, 96, 0, 32, 32, 45, -179, 576, 576)
		ctx.restore()
	}
	function draw(elapsed: number) {
		const t = elapsed % 24
		const ratio = canvas.width / W
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
		ctx.clearRect(0, 0, W, H)
		const cycle = (t * TAU) / 24
		ctx.save()
		// Keep the static plate pixel-stable; animate only the independent effects.
		// The full-resolution master is sampled once, without a floating camera zoom.
		ctx.imageSmoothingEnabled = true
		ctx.imageSmoothingQuality = 'high'
		ctx.drawImage(base, 0, 0, W, H)
		drawMoon()
		drawClouds(elapsed)
		drawShield(t)
		drawSword(t)
		const bob = 5.2 * Math.sin(cycle * 3) + 1.3 * Math.sin(cycle * 6 + 0.4)
		const sx = 1150,
			sy = 247 + bob
		const pulse = 0.8 + 0.12 * Math.sin(cycle * 3 + 0.5) + 0.06 * Math.sin(cycle * 7)
		ctx.save()
		ctx.globalCompositeOperation = 'screen'
		glow(sx, sy, 195, '255,195,102', 0.42 * pulse)
		glow(sx, sy, 88, '255,232,177', 0.15 * pulse)
		glow(1134, 495, 165, '255,194,101', 0.13 * pulse)
		glow(790, 191, 90, '255,201,129', 0.055 * pulse)
		// Narrow rays breathe with the star, instead of rotating the whole scene.
		ctx.translate(sx, sy)
		for (let i = 0; i < 8; i++) {
			ctx.save()
			ctx.rotate((i * TAU) / 8 + 0.08 * Math.sin(cycle))
			const g = ctx.createLinearGradient(0, 35, 0, 155)
			g.addColorStop(0, `rgba(255,228,165,${0.13 * pulse})`)
			g.addColorStop(1, 'transparent')
			ctx.fillStyle = g
			ctx.beginPath()
			ctx.moveTo(-2, 30)
			ctx.lineTo(-6, 155)
			ctx.lineTo(6, 155)
			ctx.lineTo(2, 30)
			ctx.fill()
			ctx.restore()
		}
		ctx.restore()
		ctx.save()
		ctx.globalCompositeOperation = 'screen'
		for (const polygon of armor) {
			ctx.save()
			path(polygon)
			ctx.clip()
			const x = ((t / 8) % 1) * 1350 - 240
			const glint = ctx.createLinearGradient(x - 100, 0, x + 150, 450)
			glint.addColorStop(0, 'transparent')
			glint.addColorStop(0.4, 'rgba(160,88,255,0)')
			glint.addColorStop(0.5, 'rgba(206,149,255,.28)')
			glint.addColorStop(0.58, 'rgba(136,81,250,.09)')
			glint.addColorStop(1, 'transparent')
			ctx.fillStyle = glint
			ctx.fillRect(550, 0, 650, 520)
			ctx.restore()
		}
		ctx.restore()
		// Staggered particles have invisible births/deaths, so the loop has no pop.
		dust.forEach((d) => {
			const q = (elapsed / d.life + d.phase) % 1,
				alpha = Math.pow(Math.sin(Math.PI * q), 0.65) * 0.9
			const x =
				1145 +
				(rand(d.seed) - 0.5) * 170 +
				Math.sin(q * 4 + d.seed) * 24 +
				q * (45 + rand(d.seed + 2) * 85)
			const y = 490 - q * (180 + rand(d.seed + 9) * 130)
			const size = d.size * (1 - q * 0.4)
			ctx.fillStyle = `rgba(7,10,16,${alpha})`
			ctx.fillRect(x, y, size, size)
			if (d.seed % 3 === 0) {
				ctx.fillRect(x - size * 0.65, y + size * 0.4, size * 0.7, size * 0.65)
				ctx.fillRect(x + size * 0.65, y - size * 0.5, size * 0.55, size * 0.6)
			}
		})
		ctx.save()
		ctx.globalCompositeOperation = 'screen'
		sparks.forEach((d) => {
			const q = (t / d.life + d.phase) % 1,
				alpha = Math.pow(Math.sin(Math.PI * q), 1.7) * 0.55
			const x = 1140 + (rand(d.seed + 7) - 0.5) * 150 + Math.sin(q * 4 + d.seed) * 14
			const y = 440 - q * (130 + rand(d.seed + 19) * 120)
			ctx.fillStyle = `rgba(255,207,122,${alpha})`
			ctx.fillRect(x, y, d.size * 0.45, d.size * 0.45)
		})
		ctx.restore()
		const angle = cycle * 2 + 0.12 * Math.sin(cycle * 2)
		drawStar(t, angle, sx, sy)
		ctx.restore()
		canvas.dataset.animationTime = elapsed.toFixed(3)
	}

	function canAnimate() {
		return ready && !destroyed && !paused && visible && !document.hidden && !reducedMotion.matches
	}
	function tick(now: number) {
		frame = 0
		if (!canAnimate()) return
		if (last) time += Math.min((now - last) / 1000, 0.1)
		last = now
		draw(time)
		frame = requestAnimationFrame(tick)
	}
	function updatePlayback() {
		if (frame) cancelAnimationFrame(frame)
		frame = 0
		last = 0
		if (canAnimate()) frame = requestAnimationFrame(tick)
	}
	function resize() {
		if (destroyed) return
		const width = canvas.getBoundingClientRect().width
		if (width <= 0) return
		canvas.width = Math.min(
			artworkWidth,
			Math.max(1, Math.round(width * Math.min(2, devicePixelRatio || 1))),
		)
		canvas.height = Math.round(canvas.width / 3)
		cloudField?.resize(canvas.width, canvas.height)
		if (ready) draw(time)
	}
	const observer = new ResizeObserver(resize)
	observer.observe(canvas)
	const intersection = new IntersectionObserver((entries) => {
		visible = entries[0].isIntersecting
		updatePlayback()
	})
	intersection.observe(canvas)
	document.addEventListener('visibilitychange', updatePlayback)
	reducedMotion.addEventListener('change', updatePlayback)
	const loaded = (img: HTMLImageElement, url: string) =>
		new Promise<void>((resolve, reject) => {
			img.onload = () => resolve()
			img.onerror = () => reject(new Error('Unable to load about-page artwork'))
			img.src = url
		})
	const imageAssets = [
		original,
		clean,
		swordTexture,
		correctedPose,
		cloudTexture,
		moonTexture,
		rebuiltWither,
		removedBeams,
	]
	const loading = Promise.all([
		loaded(original, originalUrl),
		loaded(clean, cleanUrl),
		loaded(swordTexture, swordTextureUrl),
		loaded(correctedPose, correctedPoseUrl),
		loaded(cloudTexture, cloudTextureUrl),
		loaded(moonTexture, moonTextureUrl),
		loaded(rebuiltWither, rebuiltWitherUrl),
		loaded(removedBeams, removedBeamsUrl),
	])
		.then(() => {
			if (destroyed) return
			prepare()
			ready = true
			resize()
			updatePlayback()
		})
		.finally(() => {
			for (const img of imageAssets) {
				img.onload = null
				img.onerror = null
			}
		})
	return {
		ready: loading,
		setPaused(value: boolean) {
			paused = value
			updatePlayback()
		},
		dispose() {
			if (destroyed) return
			destroyed = true
			updatePlayback()
			observer.disconnect()
			intersection.disconnect()
			document.removeEventListener('visibilitychange', updatePlayback)
			reducedMotion.removeEventListener('change', updatePlayback)
			cloudField?.dispose()
			cloudField = undefined
			for (const layer of [base, shield, star, starFace, swordFace, grippingFingers]) {
				layer.width = 1
				layer.height = 1
			}
		},
	}
}
