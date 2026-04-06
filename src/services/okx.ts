// Spec: F2.2 — OKX REST API v5, unified account, spot only
// HMAC-SHA256 signed via crypto.subtle (no external library)

import { getConfig } from '../utils/storage'
import { hmacSHA256, okxTimestamp } from '../utils/crypto'
import { normalizeOKX, type OKXDetail } from '../utils/normalize'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'

interface OKXConfig {
  apiKey: string
  secret: string
  passphrase?: string  // optional — leave blank if your API key has no passphrase
}

const OKX_BASE = 'https://www.okx.com'

async function buildOKXHeaders(
  cfg: OKXConfig,
  method: string,
  path: string,
  body = '',
): Promise<HeadersInit> {
  const timestamp = okxTimestamp()
  const message = timestamp + method.toUpperCase() + path + body
  const sign = await hmacSHA256(cfg.secret, message)

  return {
    'OK-ACCESS-KEY': cfg.apiKey,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': cfg.passphrase ?? '',
    'Content-Type': 'application/json',
  }
}

async function fetchOKXBalance(cfg: OKXConfig): Promise<OKXDetail[]> {
  const path = '/api/v5/account/balance'
  const headers = await buildOKXHeaders(cfg, 'GET', path)
  const res = await fetch(`${OKX_BASE}${path}`, { headers })
  if (res.status === 401) throw new Error('OKX auth failed — check API key / secret / passphrase')
  if (!res.ok) throw new Error(`OKX balance failed: ${res.status}`)

  const data = await res.json() as { data: Array<{ details: OKXDetail[] }> }
  return data.data?.[0]?.details ?? []
}

async function fetchOKXPrice(ccy: string): Promise<number> {
  if (ccy === 'USDT' || ccy === 'USDC' || ccy === 'USD') return 1

  const path = `/api/v5/market/ticker?instId=${ccy}-USDT`
  try {
    const res = await fetch(`${OKX_BASE}${path}`)
    if (!res.ok) return 0
    const data = await res.json() as { data: Array<{ last: string }> }
    return parseFloat(data.data?.[0]?.last ?? '0') || 0
  } catch {
    return 0
  }
}

export async function fetchOKXHoldings(): Promise<HoldingRecord[]> {
  const cfg = getConfig<OKXConfig>(STORAGE_KEYS.okx)
  if (!cfg?.apiKey || !cfg?.secret) return []

  const details = await fetchOKXBalance(cfg)
  const nonZero = details.filter((d) => parseFloat(d.eq) > 0)

  const holdings = await Promise.all(
    nonZero.map(async (d) => {
      const price = await fetchOKXPrice(d.ccy)
      return normalizeOKX(d, price)
    }),
  )

  return holdings.filter((h) => h.marketValue > 0.01)
}
