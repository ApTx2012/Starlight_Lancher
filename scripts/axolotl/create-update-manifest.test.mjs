import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..', '..')
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'starlight-update-manifest-'))
const releasePath = path.join(directory, 'release.json')
const signaturesPath = path.join(directory, 'signatures')
const outputPath = path.join(directory, 'latest.json')
const tag = 'v1.9.7'
const updaterAssets = [
	'Axolotl_Launcher_universal.app.tar.gz',
	'Axolotl_Launcher_1.9.7_aarch64.AppImage.tar.gz',
	'Axolotl_Launcher_1.9.7_amd64.AppImage.tar.gz',
	'Axolotl_Launcher_1.9.7_x64-setup.nsis.zip',
]
const debAssets = [
	'Axolotl_Launcher_1.9.7_amd64.deb',
	'Axolotl_Launcher_1.9.7_arm64.deb',
]

try {
	fs.mkdirSync(signaturesPath)
	for (const name of updaterAssets) {
		fs.writeFileSync(path.join(signaturesPath, `${name}.sig`), 'signature'.repeat(8))
	}
	fs.writeFileSync(
		releasePath,
		JSON.stringify({
			body: '测试版本',
			assets: [...updaterAssets, ...debAssets].map((name, index) => ({
				name,
				size: index + 1024,
				digest: `sha256:${crypto.createHash('sha256').update(name).digest('hex')}`,
				browser_download_url: `https://github.com/Mystic-Stars/Axolotl/releases/download/${tag}/${name}`,
			})),
		}),
	)

	const create = spawnSync(
		process.execPath,
		[
			'scripts/axolotl/create-update-manifest.mjs',
			releasePath,
			signaturesPath,
			tag,
			outputPath,
		],
		{ cwd: root, encoding: 'utf8' },
	)
	assert.equal(create.status, 0, create.stderr)

	const manifest = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
	assert.equal(manifest.version, '1.9.7')
	assert.deepEqual(Object.keys(manifest.apt).sort(), ['linux-aarch64', 'linux-x86_64'])
	assert.equal(manifest.apt['linux-x86_64'].size, 1028)
	assert.match(manifest.apt['linux-aarch64'].sha256, /^[0-9a-f]{64}$/)

	const verify = spawnSync(
		process.execPath,
		['scripts/axolotl/verify-update-manifest.mjs', outputPath, tag],
		{
			cwd: root,
			encoding: 'utf8',
			env: { ...process.env, GITHUB_REPOSITORY: 'Mystic-Stars/Axolotl' },
		},
	)
	assert.equal(verify.status, 0, verify.stderr)
} finally {
	fs.rmSync(directory, { recursive: true, force: true })
}
