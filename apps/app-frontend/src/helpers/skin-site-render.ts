import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

/**
 * Renders a player's skin into a base64 head image, mirroring the skin site's
 * own head cropper (front face at 8,8 plus the hat overlay at 40,8).
 *
 * The skin image is loaded through the Tauri HTTP client first so cross-origin
 * textures do not taint the canvas, then drawn once as a data URL.
 */
const HEAD_BUFFER_SIZE = 18
const HEAD_FACE = { sx: 8, sy: 8, sw: 8, sh: 8, dx: 1, dy: 1, dw: 16, dh: 16 }
const HEAD_HAT = { sx: 40, sy: 8, sw: 8, sh: 8, dx: 0, dy: 0, dw: 18, dh: 18 }

let buffer: HTMLCanvasElement | null = null

function getBuffer(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
	if (!buffer) buffer = document.createElement('canvas')
	const ctx = buffer.getContext('2d')
	if (!ctx) throw new Error('无法创建皮肤渲染画布')
	return { canvas: buffer, ctx }
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error('无法加载皮肤图片'))
		img.src = src
	})
}

/** Crop the head (and hat overlay) from a locally downloaded skin data URL. */
export async function renderSkinHead(skinDataUrl: string, scale = 2): Promise<string> {
	const img = await loadImage(skinDataUrl)
	const { canvas, ctx } = getBuffer()

	canvas.width = HEAD_BUFFER_SIZE
	canvas.height = HEAD_BUFFER_SIZE
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.imageSmoothingEnabled = false

	ctx.drawImage(
		img,
		HEAD_FACE.sx,
		HEAD_FACE.sy,
		HEAD_FACE.sw,
		HEAD_FACE.sh,
		HEAD_FACE.dx,
		HEAD_FACE.dy,
		HEAD_FACE.dw,
		HEAD_FACE.dh,
	)
	ctx.globalCompositeOperation = 'source-over'
	ctx.drawImage(
		img,
		HEAD_HAT.sx,
		HEAD_HAT.sy,
		HEAD_HAT.sw,
		HEAD_HAT.sh,
		HEAD_HAT.dx,
		HEAD_HAT.dy,
		HEAD_HAT.dw,
		HEAD_HAT.dh,
	)

	if (scale <= 1) return canvas.toDataURL('image/png')

	const small = await createImageBitmap(canvas)
	canvas.width = Math.floor(HEAD_BUFFER_SIZE * scale)
	canvas.height = Math.floor(HEAD_BUFFER_SIZE * scale)
	ctx.imageSmoothingEnabled = false
	ctx.drawImage(small, 0, 0, HEAD_BUFFER_SIZE, HEAD_BUFFER_SIZE, 0, 0, canvas.width, canvas.height)
	return canvas.toDataURL('image/png')
}

/** Fetch an image URL as a data URL (used to keep full skin textures local). */
export async function fetchImageAsDataUrl(url: string): Promise<string> {
	const response = await tauriFetch(url)
	if (!response.ok) throw new Error(`无法加载图片（HTTP ${response.status}）`)
	const blob = await response.blob()
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result ?? ''))
		reader.onerror = () => reject(new Error('无法读取图片数据'))
		reader.readAsDataURL(blob)
	})
}
