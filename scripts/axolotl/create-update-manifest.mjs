import fs from 'node:fs'
import path from 'node:path'

// Build a stable release download URL from the tag and asset name instead of
// relying on `browser_download_url`. While the release is still a draft GitHub
// reports the asset URL as `.../releases/download/untagged-<hash>/...`, which
// would make the updater manifest point at a path that disappears once the
// release is published.
function buildDownloadUrl(assetName, versionTag) {
	const repository = process.env.GITHUB_REPOSITORY || 'ApTx2012/Starlight_Lancher'
	return `https://github.com/${repository}/releases/download/${versionTag}/${encodeURIComponent(assetName)}`
}
const [releasePath, signaturesPath, tag, outputPath] = process.argv.slice(2)

if (!releasePath || !signaturesPath || !tag || !outputPath) {
	throw new Error(
		'Usage: node create-update-manifest.mjs <release.json> <signatures-dir> <version-tag> <output.json>',
	)
}

const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'))
const assets = release.assets

if (!Array.isArray(assets)) {
	throw new Error('Release metadata does not contain an assets array')
}

const targets = [
	{
		platforms: ['darwin-aarch64', 'darwin-x86_64'],
		assetSuffix: '_universal.app.tar.gz',
	},
	{
		platforms: ['linux-aarch64'],
		assetSuffix: '_aarch64.AppImage.tar.gz',
	},
	{
		platforms: ['linux-x86_64'],
		assetSuffix: '_amd64.AppImage.tar.gz',
	},
	{
		platforms: ['windows-x86_64'],
		assetSuffix: '_x64-setup.nsis.zip',
	},
]

const platforms = {}

for (const target of targets) {
	const matches = assets.filter((asset) => asset.name?.endsWith(target.assetSuffix))
	if (matches.length !== 1) {
		throw new Error(
			`Expected one release asset ending in ${target.assetSuffix}, found ${matches.length}`,
		)
	}

	const asset = matches[0]
	const signaturePath = path.join(signaturesPath, `${asset.name}.sig`)
	if (!fs.existsSync(signaturePath)) {
		throw new Error(`Missing updater signature ${path.basename(signaturePath)}`)
	}

	const signature = fs.readFileSync(signaturePath, 'utf8')
	const url = buildDownloadUrl(asset.name, tag)

	for (const platform of target.platforms) {
		platforms[platform] = { signature, url }
	}
}

function digest(asset) {
	if (typeof asset.digest !== 'string' || !asset.digest.startsWith('sha256:')) {
		throw new Error(`Release asset ${asset.name} has no SHA-256 digest`)
	}
	return asset.digest.slice('sha256:'.length)
}

const apt = {}
for (const target of [
	{ platform: 'linux-x86_64', assetSuffix: '_amd64.deb' },
	{ platform: 'linux-aarch64', assetSuffix: '_arm64.deb' },
]) {
	const matches = assets.filter((asset) => asset.name?.endsWith(target.assetSuffix))
	if (matches.length !== 1) {
		throw new Error(
			`Expected one release asset ending in ${target.assetSuffix}, found ${matches.length}`,
		)
	}
	const asset = matches[0]
	const url = buildDownloadUrl(asset.name, tag)
	if (!Number.isSafeInteger(asset.size) || asset.size <= 0) {
		throw new Error(`Release asset ${asset.name} has invalid download metadata`)
	}
	apt[target.platform] = {
		url,
		sha256: digest(asset),
		size: asset.size,
	}
}

const manifest = {
	version: tag.replace(/^v/, ''),
	notes: release.body ?? '',
	pub_date: new Date().toISOString(),
	platforms,
	apt,
}

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
