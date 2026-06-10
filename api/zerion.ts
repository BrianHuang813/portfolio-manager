// Vercel Serverless Proxy — forwards Zerion API requests server-side
// Bypasses CORS restriction that blocks direct browser requests to api.zerion.io
// Called by frontend as: GET /api/zerion?address=0x...
// Browser sends the Zerion-compatible HTTP Basic Authorization header.
// The proxy forwards it without exposing the key in the URL.

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — allow requests from any origin (this is our own proxy)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const address = req.query['address']
  const authorization = req.headers.authorization

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' })
  }
  if (
    typeof authorization !== 'string'
    || !authorization.toLowerCase().startsWith('basic ')
  ) {
    return res.status(400).json({ error: 'Missing Zerion Basic authorization' })
  }

  const url  = `https://api.zerion.io/v1/wallets/${address}/positions/?filter[positions]=only_simple&currency=usd&filter[trash]=only_non_trash&sort=-value`

  try {
    const upstream = await fetch(url, {
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
      },
    })
    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Upstream Zerion request failed', detail: String(err) })
  }
}
