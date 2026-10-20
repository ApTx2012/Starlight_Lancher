import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../apps/app-frontend/package.json', import.meta.url))
const ts = require('typescript')
const { parse } = require('vue/compiler-sfc')

/** Read the message IDs actually used by skin-site UI, including uncataloged messages. */
export function collectSkinSiteMessages(root = 'apps/app-frontend/src') {
	const messages = new Map()
	function walk(directory) {
		for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
			const file = path.join(directory, entry.name)
			if (entry.isDirectory()) {
				if (entry.name !== 'locales') walk(file)
				continue
			}
			if (!/\.(vue|ts)$/.test(file) || file.endsWith('.test.ts')) continue
			let source = fs.readFileSync(file, 'utf8')
			if (file.endsWith('.vue')) {
				const { descriptor } = parse(source)
				source = [descriptor.script?.content, descriptor.scriptSetup?.content]
					.filter(Boolean)
					.join('\n')
			}
			const ast = ts.createSourceFile(`${file}.ts`, source, ts.ScriptTarget.Latest, true)
			function visit(node) {
				if (ts.isObjectLiteralExpression(node)) {
					const properties = Object.fromEntries(
						node.properties
							.filter(ts.isPropertyAssignment)
							.map((property) => [
								property.name.getText(ast).replace(/^['"]|['"]$/g, ''),
								property.initializer,
							]),
					)
					if (
						properties.id &&
						properties.defaultMessage &&
						ts.isStringLiteralLike(properties.id) &&
						ts.isStringLiteralLike(properties.defaultMessage) &&
						properties.id.text.startsWith('app.skin-site.')
					) {
						messages.set(properties.id.text, {
							id: properties.id.text,
							defaultMessage: properties.defaultMessage.text,
							file,
						})
					}
				}
				ts.forEachChild(node, visit)
			}
			visit(ast)
		}
	}
	walk(root)
	return [...messages.values()]
}
