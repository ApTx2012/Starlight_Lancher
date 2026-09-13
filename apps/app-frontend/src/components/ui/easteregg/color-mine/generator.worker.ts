import { type Difficulty, generate } from './engine'

self.onmessage = (event: MessageEvent<{ seed: number; difficulty: Difficulty }>) => {
	try {
		self.postMessage({ puzzle: generate(event.data.seed, event.data.difficulty) })
	} catch {
		self.postMessage({ error: true })
	}
}
