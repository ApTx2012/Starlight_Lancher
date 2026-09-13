const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const test = require('node:test')
const source = fs.readFileSync(require('node:path').join(__dirname, 'skin_site_bridge.js'), 'utf8')

function harness(origin = 'https://skin.starlight.cool') {
  let token = null
  const listeners = {}, messages = [], requests = []
  let tick
  let result = async () => ({ ok: true, status: 200, json: async () => ({ payload: { uuid: 'one', username: 'One' } }) })
  const parent = { postMessage(data, target) { messages.push({ data, target }) } }
  const context = {
    location: { origin },
    window: { parent, addEventListener(type, callback) { listeners[type] = callback } },
    localStorage: { getItem() { return token } },
    fetch(...args) { requests.push(args); return result(...args) },
    AbortController, Date, setTimeout, clearTimeout,
    setInterval(callback) { tick = callback; return 1 }, clearInterval() {},
  }
  vm.runInNewContext(source, context)
  return {
    messages, requests, listeners, parent,
    token(value) { token = value }, result(value) { result = value },
    async tick() { tick?.(); await new Promise(setImmediate) },
    async connect(origin = 'http://localhost:5201', source = parent) {
      listeners.message?.({ source, origin, data: { type: 'starlight-skin-session-connect' } })
      await new Promise(setImmediate)
    },
  }
}

test('bridge is restricted to the skin origin and an allowlisted parent', async () => {
  assert.equal(harness('https://evil.example').listeners.message, undefined)
  const h = harness(); h.token('test-token')
  await h.connect('https://evil.example'); await h.connect('http://localhost:5201', {})
  assert.equal(h.requests.length, 0); assert.equal(h.messages.length, 0)
  await h.connect()
  assert.equal(h.requests[0][0], '/starlight/user')
  assert.equal(h.requests[0][1].headers.Authorization, 'Bearer test-token')
  assert.equal(h.requests[0][1].redirect, 'error')
  assert.equal(h.messages.at(-1).data.status, 'signed-in')
  assert.ok(h.messages.every(m => m.target === 'http://localhost:5201'))
  assert.ok(!JSON.stringify(h.messages).includes('test-token'))
})

test('logout, invalid token, network error and account switching replace old state', async () => {
  const h = harness(); await h.connect()
  assert.equal(h.messages.at(-1).data.status, 'signed-out')
  h.token('first'); await h.tick(); assert.equal(h.messages.at(-1).data.user.username, 'One')
  h.result(async () => ({ ok: false, status: 401 }))
  h.token('expired'); await h.tick(); assert.equal(h.messages.at(-1).data.status, 'signed-out')
  h.result(async () => { throw Error('offline') })
  h.token('network-error'); await h.tick(); assert.equal(h.messages.at(-1).data.status, 'error')
  h.token(null); await h.tick(); assert.equal(h.messages.at(-1).data.status, 'signed-out')
})

test('a delayed response cannot restore the user after logout', async () => {
  const h = harness(); let finish
  h.result(() => new Promise(resolve => { finish = resolve }))
  h.token('first'); await h.connect()
  h.token(null); await h.tick()
  finish({ ok: true, status: 200, json: async () => ({ payload: { uuid: 'one', username: 'One' } }) })
  await new Promise(setImmediate)
  assert.equal(h.messages.at(-1).data.status, 'signed-out')
  assert.ok(!h.messages.some(m => m.data.status === 'signed-in'))
})
