// Vercel Serverless Proxy — forwards Zerion API requests server-side
// Bypasses CORS restriction that blocks direct browser requests to api.zerion.io
// Called by frontend as: GET /api/zerion?address=0x...
// API key is passed via Authorization: Bearer (never in URL).
// X-Zerion-Key remains supported for older deployed clients.

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — allow requests from any origin (this is our own proxy)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Zerion-Key')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const address = req.query['address']
  const authorization = req.headers.authorization
  const bearerKey = typeof authorization === 'string'
    && authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : ''
  const legacyKey = req.headers['x-zerion-key']
  const apiKey = bearerKey || (typeof legacyKey === 'string' ? legacyKey.trim() : '')

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' })
  }
  if (!apiKey) {
    return res.status(400).json({ error: 'Missing Zerion API authorization' })
  }

  const auth = Buffer.from(`${apiKey}:`).toString('base64')
  const url  = `https://api.zerion.io/v1/wallets/${address}/positions/?filter[positions]=only_simple&currency=usd&filter[trash]=only_non_trash&sort=-value`

  try {
    const upstream = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    })
    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Upstream Zerion request failed', detail: String(err) })
  }
}
