import { randomUUID } from 'node:crypto'
import { open, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export async function publishSkinSite({
	archivePath,
	tag,
	token,
	baseUrl = 'https://skin.starlight.cool',
	fetchImpl = fetch,
	sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
	now = Date.now,
	timeoutMs = 30 * 60 * 1000,
	pollIntervalMs = 2000,
	log = console.log,
}) {
	if (!token) throw new Error('SKIN_SITE_CI_UPLOAD_TOKEN is required to publish to the skin site')
	if (!archivePath || !/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag ?? '')) {
		throw new Error('Expected a complete update ZIP and a semantic version tag')
	}
	const version = tag.replace(/^v/, '')
	const url = new URL(baseUrl)
	if (url.protocol !== 'https:' || url.username || url.password) {
		throw new Error('SKIN_SITE_URL must be an HTTPS URL without credentials')
	}
	const { size } = await stat(archivePath)
	if (!archivePath.toLowerCase().endsWith('.zip') || size < 1 || size > 4 * 1024 ** 3) {
		throw new Error('Expected a nonempty complete update ZIP no larger than 4 GiB')
	}
	const deadline = now() + timeoutMs
	function remainingTime() {
		const remaining = deadline - now()
		if (remaining <= 0) throw new Error('Skin site publication timed out')
		return remaining
	}
	async function request(route, { method = 'GET', body, chunk = false } = {}) {
		const attempts = chunk ? 3 : 1
		for (let attempt = 0; attempt < attempts; attempt++) {
			const requestTimeout = Math.min(120_000, remainingTime())
			let response
			try {
				response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/starlight/${route}`, {
					method,
					headers: {
						Authorization: `Bearer ${token}`,
						...(body && !chunk ? { 'Content-Type': 'application/json' } : {}),
					},
					body: body && !chunk ? JSON.stringify(body) : body,
					signal: AbortSignal.timeout(requestTimeout),
					redirect: 'error',
				})
			} catch {
				if (attempt + 1 === attempts)
					throw new Error(`Skin site ${route}: network request failed or timed out`)
				await sleep(500 * (attempt + 1))
				continue
			}
			if (!response.ok) {
				await response.body?.cancel()
				if ((response.status === 429 || response.status >= 500) && attempt + 1 < attempts) {
					await sleep(500 * (attempt + 1))
					continue
				}
				throw new Error(`Skin site ${route}: HTTP ${response.status}`)
			}
			let result
			try {
				result = await response.json()
			} catch {
				throw new Error(`Skin site ${route}: invalid JSON response`)
			}
			if (result?.success !== true || !result.payload) {
				throw new Error(
					`Skin site ${route}: ${result?.errorMessage || 'request was rejected or payload is missing'}`,
				)
			}
			return result.payload
		}
	}

	let status = await request('launcher/admin/uploads', {
		method: 'POST',
		body: {
			uploadId: randomUUID(),
			filename: path.basename(archivePath),
			size,
			forceUpdate: false,
		},
	})
	if (typeof status.id !== 'string' || !status.id)
		throw new Error('Skin site returned an invalid upload ID')
	const uploadRoute = `launcher/admin/uploads/${encodeURIComponent(status.id)}`
	log(`Skin site upload ${status.id}: ${size} bytes`)
	const file = await open(archivePath, 'r')
	try {
		for (;;) {
			remainingTime()
			if (status.state === 'ready') {
				const release = status.release
				if (!Number.isSafeInteger(release?.id) || release.id <= 0 || release.version !== version) {
					throw new Error(
						`Skin site returned an invalid release or a version other than ${version}`,
					)
				}
				const activated = await request(`launcher/admin/${release.id}/activate`, { method: 'POST' })
				if (
					activated.id !== release.id ||
					activated.version !== version ||
					activated.active !== true
				) {
					throw new Error(`Skin site did not confirm activation of ${version}`)
				}
				log(`Skin site release ${version} published (id ${release.id})`)
				return activated
			}
			if (status.state === 'failed' || status.state === 'cancelled') {
				throw new Error(
					`Skin site archive processing ${status.state}: ${status.errorMessage || 'no error details'}`,
				)
			}
			if (status.state === 'processing') {
				await sleep(Math.min(pollIntervalMs, remainingTime()))
				status = await request(uploadRoute)
				continue
			}
			if (
				status.state !== 'uploading' ||
				status.size !== size ||
				!Number.isSafeInteger(status.chunkSize) ||
				status.chunkSize < 1 ||
				status.chunkSize > 64 * 1024 ** 2 ||
				!Number.isSafeInteger(status.received) ||
				status.received < 0 ||
				status.received > size ||
				!Array.isArray(status.receivedChunks)
			) {
				throw new Error('Skin site returned invalid upload status or chunk size')
			}
			const count = Math.ceil(size / status.chunkSize)
			if (
				status.receivedChunks.some(
					(index) => !Number.isSafeInteger(index) || index < 0 || index >= count,
				)
			) {
				throw new Error('Skin site returned invalid received chunk indices')
			}
			const received = new Set(status.receivedChunks)
			const missing = Array.from({ length: count }, (_, index) => index).filter(
				(index) => !received.has(index),
			)
			if (!missing.length) {
				if (status.received !== size)
					throw new Error('Skin site received byte count does not match the archive')
				status = await request(`${uploadRoute}/complete`, { method: 'POST' })
				continue
			}
			const chunkSize = status.chunkSize
			const concurrency = Math.min(
				Number.isSafeInteger(status.uploadConcurrency) && status.uploadConcurrency > 0
					? status.uploadConcurrency
					: 1,
				6,
				missing.length,
			)
			let cursor = 0
			let uploadError
			async function worker() {
				try {
					while (!uploadError && cursor < missing.length) {
						remainingTime()
						const index = missing[cursor++]
						const start = index * chunkSize
						const bytes = Buffer.alloc(Math.min(chunkSize, size - start))
						let offset = 0
						while (offset < bytes.length) {
							const { bytesRead } = await file.read(
								bytes,
								offset,
								bytes.length - offset,
								start + offset,
							)
							if (!bytesRead) throw new Error('Update archive changed or ended during upload')
							offset += bytesRead
						}
						const form = new FormData()
						form.append('file', new Blob([bytes]), 'chunk.bin')
						await request(`${uploadRoute}/chunks/${index}`, {
							method: 'POST',
							body: form,
							chunk: true,
						})
					}
				} catch (error) {
					uploadError ??= error
				}
			}
			await Promise.all(Array.from({ length: concurrency }, worker))
			if (uploadError) throw uploadError
			status = await request(uploadRoute)
			log(`Skin site uploaded ${status.received}/${size} bytes`)
		}
	} finally {
		await file.close()
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	try {
		await publishSkinSite({
			archivePath: process.argv[2],
			tag: process.argv[3],
			token: process.env.SKIN_SITE_TOKEN,
			baseUrl: process.env.SKIN_SITE_URL || 'https://skin.starlight.cool',
		})
	} catch (error) {
		const message = String(error.message).replaceAll(
			process.env.SKIN_SITE_TOKEN || '\0',
			'[redacted]',
		)
		console.error(
			`::error::${message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`,
		)
		process.exitCode = 1
	}
}
