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

  const data = await res.json() as { code: string; msg: string; data: Array<{ details: OKXDetail[] }> }
  console.debug('[OKX] response code:', data.code, 'msg:', data.msg)
  console.debug('[OKX] details count:', data.data?.[0]?.details?.length ?? 0)
  if (data.code !== '0') throw new Error(`OKX API error ${data.code}: ${data.msg}`)
  return data.data?.[0]?.details ?? []
}

export async function fetchOKXHoldings(): Promise<HoldingRecord[]> {
  const raw = getConfig<OKXConfig>(STORAGE_KEYS.okx)
  if (!raw?.apiKey || !raw?.secret) return []
  const cfg: OKXConfig = {
    apiKey:     raw.apiKey.trim(),
    secret:     raw.secret.trim(),
    passphrase: raw.passphrase?.trim() ?? '',
  }
  if (!cfg.apiKey || !cfg.secret) return []

  const details = await fetchOKXBalance(cfg)

  // Filter: has any quantity AND has USD value
  const nonZero = details.filter(
    (d) => parseFloat(d.eq) > 0 && parseFloat(d.eqUsd ?? '0') > 0.01,
  )

  return nonZero.map(normalizeOKX)
}
