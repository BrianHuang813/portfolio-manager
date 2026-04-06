// Vercel Serverless Proxy — forwards signed OKX private API requests server-side
// Bypasses CORS restrictions on certain OKX endpoints (e.g. /api/v5/finance/savings/balance)
// Called by frontend as: GET /api/okx?path=/api/v5/finance/savings/balance
// Auth headers (pre-signed client-side) are forwarded as-is — no credentials stored here.

import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED_PREFIXES = ['/api/v5/finance/']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type, OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP, OK-ACCESS-PASSPHRASE')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const path = req.query['path']
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing ?path= query param' })
  }
  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return res.status(403).json({ error: 'Path not allowed' })
  }

  // Forward pre-signed OKX auth headers from the browser
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  for (const h of ['ok-access-key', 'ok-access-sign', 'ok-access-timestamp', 'ok-access-passphrase']) {
    const v = req.headers[h]
    if (v) headers[h.toUpperCase().replace(/-/g, '-')] = Array.isArray(v) ? v[0]! : v
  }

  try {
    const upstream = await fetch(`https://www.okx.com${path}`, { headers })
    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Upstream OKX request failed', detail: String(err) })
  }
}
