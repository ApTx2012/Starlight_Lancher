// Runs inside the embedded skin site only. The JWT never leaves that origin.
(() => {
  if (location.origin !== 'https://skin.starlight.cool' || window.parent === window) return

  const launcherOrigins = new Set([
    'http://localhost:5201',
    'http://tauri.localhost',
    'https://tauri.localhost',
    'tauri://localhost',
  ])
  let parentOrigin
  let lastToken
  let lastCheck = 0
  let generation = 0
  let pending
  let snapshot = { status: 'checking', user: null }

  function publish(status, user = null) {
    snapshot = { status, user }
    if (parentOrigin) {
      window.parent.postMessage({ type: 'starlight-skin-session', ...snapshot }, parentOrigin)
    }
  }

  async function checkSession(force = false) {
    if (!parentOrigin) return
    let token
    try {
      token = localStorage.getItem('loginToken') || ''
    } catch {
      publish('error')
      return
    }
    const changed = token !== lastToken
    if (!changed && (pending || (!force && Date.now() - lastCheck < 60_000))) return
    const revision = ++generation
    pending?.abort()
    pending = undefined
    lastToken = token
    lastCheck = Date.now()
    if (!token) {
      publish('signed-out')
      return
    }
    if (changed) publish('checking')
    const controller = new AbortController()
    pending = controller
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch('/starlight/user', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: 'no-store',
        redirect: 'error',
      })
      const body = response.ok ? await response.json() : null
      // A logout or account switch must win over an older in-flight response.
      if (revision !== generation || localStorage.getItem('loginToken') !== token) return
      if (response.status === 401 || response.status === 403 || body?.payload?.banned) {
        publish('signed-out')
      } else if (
        response.ok && typeof body?.payload?.uuid === 'string' &&
        typeof body.payload.username === 'string' && body.payload.username.length > 0
      ) {
        publish('signed-in', { uuid: body.payload.uuid, username: body.payload.username })
      } else {
        publish('error')
      }
    } catch {
      if (revision === generation) publish('error')
    } finally {
      clearTimeout(timeout)
      if (revision === generation) pending = undefined
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || !launcherOrigins.has(event.origin)) return
    if (event.data?.type !== 'starlight-skin-session-connect') return
    parentOrigin = event.origin
    publish(snapshot.status, snapshot.user)
    void checkSession(true)
  })
  // Storage events cover other tabs; polling also covers same-document SPA login/logout.
  window.addEventListener('storage', () => void checkSession())
  let timer = setInterval(() => void checkSession(), 1000)
  window.addEventListener('pagehide', () => {
    clearInterval(timer)
    ++generation
    pending?.abort()
    pending = undefined
  })
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return
    timer = setInterval(() => void checkSession(), 1000)
    void checkSession(true)
  })
})()
