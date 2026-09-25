import fs from 'node:fs'

const [manifestPath, tag, source = 'github'] = process.argv.slice(2)
const expectedVersion = tag?.replace(/^v/, '')
const githubRepository = process.env.GITHUB_REPOSITORY || 'ApTx2012/Starlight_Lancher'
const cnbRepository = process.env.CNB_REPO_SLUG || 'axlmc/Axolotl'

if (!manifestPath || !expectedVersion || !['github', 'cnb'].includes(source)) {
	throw new Error('Usage: node verify-update-manifest.mjs <latest.json> <version-tag> [github|cnb]')
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

if (manifest.version !== expectedVersion) {
	throw new Error(`Manifest version ${manifest.version} does not match ${expectedVersion}`)
}

const requiredPlatforms = [
	'darwin-aarch64',
	'darwin-x86_64',
	'linux-aarch64',
	'linux-x86_64',
	'windows-x86_64',
]

for (const platform of requiredPlatforms) {
	const update = manifest.platforms?.[platform]

	if (!update || typeof update.signature !== 'string' || update.signature.trim().length < 32) {
		throw new Error(`Missing signed update for ${platform}`)
	}

	const url = new URL(update.url)
	const pathname = decodeURIComponent(url.pathname).toLowerCase()
	const isExpectedUrl =
		url.protocol === 'https:' &&
		(source === 'github'
			? url.hostname === 'github.com' &&
				pathname.startsWith(
					`/${githubRepository.toLowerCase()}/releases/download/${tag.toLowerCase()}/`,
				)
			: url.hostname === 'cnb.cool' &&
				pathname.startsWith(
					`/${cnbRepository.toLowerCase()}/-/releases/download/${tag.toLowerCase()}/`,
				))
	if (!isExpectedUrl) {
		throw new Error(`Unexpected ${source} update URL for ${platform}: ${update.url}`)
	}
}

for (const platform of ['linux-aarch64', 'linux-x86_64']) {
	const artifact = manifest.apt?.[platform]
	if (
		!artifact ||
		typeof artifact.sha256 !== 'string' ||
		!/^[0-9a-f]{64}$/i.test(artifact.sha256) ||
		!Number.isSafeInteger(artifact.size) ||
		artifact.size <= 0
	) {
		throw new Error(`Missing Debian update for ${platform}`)
	}

	const url = new URL(artifact.url)
	if (url.protocol !== 'https:') {
		throw new Error(`Unexpected Debian update URL for ${platform}: ${artifact.url}`)
	}
}

console.log(`Verified signed ${source} updater manifest for ${expectedVersion}`)
