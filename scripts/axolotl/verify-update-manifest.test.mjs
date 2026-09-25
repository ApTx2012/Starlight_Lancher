import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

test('update manifests must point to the configured repository and release tag', () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'starlight-manifest-'))
	const manifestPath = path.join(directory, 'latest.json')
	const tag = 'v1.0.0-beta12'
	const repository = 'ApTx2012/Starlight_Lancher'
	const platforms = [
		'darwin-aarch64',
		'darwin-x86_64',
		'linux-aarch64',
		'linux-x86_64',
		'windows-x86_64',
	]
	const verify = (url) => {
		fs.writeFileSync(
			manifestPath,
			JSON.stringify({
				version: tag.slice(1),
				platforms: Object.fromEntries(
					platforms.map((platform) => [
						platform,
						{
							url,
							signature: 'x'.repeat(64),
						},
					]),
				),
				apt: Object.fromEntries(
					['linux-aarch64', 'linux-x86_64'].map((platform) => [
						platform,
						{
							url,
							sha256: 'a'.repeat(64),
							size: 123,
						},
					]),
				),
			}),
		)
		return spawnSync(
			process.execPath,
			['scripts/axolotl/verify-update-manifest.mjs', manifestPath, tag],
			{
				env: { ...process.env, GITHUB_REPOSITORY: repository },
				encoding: 'utf8',
			},
		)
	}
	try {
		const success = verify(
			`https://github.com/${repository}/releases/download/${tag}/installer.zip`,
		)
		assert.equal(success.status, 0, success.stderr)
		for (const url of [
			`https://github.com/Mystic-Stars/Axolotl/releases/download/${tag}/installer.zip`,
			`https://github.com/${repository}/releases/download/v1.0.0-beta1/installer.zip`,
			`https://example.com/${repository}/releases/download/${tag}/installer.zip`,
		]) {
			const result = verify(url)
			assert.notEqual(result.status, 0)
			assert.match(result.stderr, /Unexpected github update URL/)
		}
	} finally {
		fs.rmSync(directory, { recursive: true, force: true })
	}
})
