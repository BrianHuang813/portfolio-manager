// futu-bridge — read-only HTTP API in front of OpenD. Run behind Caddy for HTTPS.
//
//   GET /positions   Authorization: Bearer <BRIDGE_TOKEN>   → { positions, updatedAt }
//   GET /health      (public, for uptime monitors)          → 200 { ok: true } | 503 { ok: false, error }
//                    checks that OpenD is reachable and logged in; result cached for 60 s
//
// Env: BRIDGE_TOKEN (required), ALLOWED_ORIGINS (comma-separated dashboard origins),
//      FUTU_WEBSOCKET_KEY, OPEND_HOST (127.0.0.1), OPEND_WS_PORT (33333),
//      PORT (8787), HOST (127.0.0.1), CACHE_SECONDS (30)

import http from 'node:http'
import { createHash, timingSafeEqual } from 'node:crypto'
import { checkOpenD, fetchUsPositions } from './opend.js'

// futu-api logs every connect/close via console.debug; keep the journal readable
console.debug = () => {}

const env = process.env
const TOKEN = env.BRIDGE_TOKEN ?? ''
if (TOKEN.length < 32) {
  console.error('BRIDGE_TOKEN must be set to at least 32 characters (e.g. `openssl rand -hex 32`)')
  process.exit(1)
}
const ALLOWED_ORIGINS = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const OPEND = {
  host: env.OPEND_HOST || '127.0.0.1',
  port: Number(env.OPEND_WS_PORT || 33333),
  key: env.FUTU_WEBSOCKET_KEY || '',
}
const CACHE_MS = Number(env.CACHE_SECONDS || 30) * 1000

const digest = (s) => createHash('sha256').update(s).digest()
const TOKEN_DIGEST = digest(TOKEN)
function authorized(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
  return m !== null && timingSafeEqual(digest(m[1]), TOKEN_DIGEST)
}

// Coalesce concurrent requests and reuse a result for CACHE_MS to keep OpenD traffic low
let cache = null      // { body, at }
let inflight = null
async function getPositions() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.body
  inflight ??= fetchUsPositions(OPEND)
    .then((positions) => {
      cache = { body: { positions, updatedAt: new Date().toISOString() }, at: Date.now() }
      return cache.body
    })
    .finally(() => { inflight = null })
  return inflight
}

// /health is unauthenticated, so cache failures too — a public caller must not be able to hammer OpenD
const HEALTH_CACHE_MS = 60 * 1000
let health = null     // { status, body, at }
let healthInflight = null
async function getHealth() {
  if (health && Date.now() - health.at < HEALTH_CACHE_MS) return health
  healthInflight ??= checkOpenD(OPEND)
    .then(() => ({ status: 200, body: { ok: true } }))
    .catch((e) => {
      console.error(new Date().toISOString(), 'health error:', e.message)
      return { status: 503, body: { ok: false, error: e.message } }
    })
    .then((r) => { health = { ...r, at: Date.now() }; return health })
    .finally(() => { healthInflight = null })
  return healthInflight
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  }
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' })

  const { pathname } = new URL(req.url, 'http://localhost')
  if (pathname === '/health') {
    const { status, body } = await getHealth()
    return send(res, status, body)
  }
  if (pathname !== '/positions') return send(res, 404, { error: 'not found' })
  if (!authorized(req)) return send(res, 401, { error: 'unauthorized' })

  try {
    send(res, 200, await getPositions())
  } catch (e) {
    console.error(new Date().toISOString(), 'positions error:', e.message)
    send(res, 502, { error: e.message })
  }
})

server.listen(Number(env.PORT || 8787), env.HOST || '127.0.0.1', () => {
  const { address, port } = server.address()
  console.log(`futu-bridge listening on ${address}:${port}, OpenD ws://${OPEND.host}:${OPEND.port}`)
})
