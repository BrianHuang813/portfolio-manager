// Vercel Serverless Proxy — forwards Zerion API requests server-side
// Bypasses CORS restriction that blocks direct browser requests to api.zerion.io
// Called by frontend as: GET /api/zerion?address=0x...
// API key is passed via X-Zerion-Key header (never in URL)

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — allow requests from any origin (this is our own proxy)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-Zerion-Key')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const address = req.query['address']
  const apiKey  = req.headers['x-zerion-key']

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' })
  }
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'Missing X-Zerion-Key header' })
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
