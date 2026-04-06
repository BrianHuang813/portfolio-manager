// Spec: F2.2 — OKX REST API v5, unified account + funding account, spot only
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

interface OKXAssetBalance {
  ccy: string
  bal: string      // total balance
  availBal: string // available balance
  frozenBal: string
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

// Trading/Unified Account — /api/v5/account/balance
async function fetchTradingBalance(cfg: OKXConfig): Promise<OKXDetail[]> {
  const path = '/api/v5/account/balance'
  const headers = await buildOKXHeaders(cfg, 'GET', path)
  const res = await fetch(`${OKX_BASE}${path}`, { headers })
  if (res.status === 401) throw new Error('OKX auth failed — check API key / secret / passphrase')
  if (!res.ok) throw new Error(`OKX trading balance failed: ${res.status}`)

  const data = await res.json() as { code: string; msg: string; data: Array<{ details: OKXDetail[] }> }
  console.log('[OKX trading] code:', data.code, 'msg:', data.msg, 'count:', data.data?.[0]?.details?.length ?? 0)
  if (data.code !== '0') throw new Error(`OKX trading API error ${data.code}: ${data.msg}`)
  return data.data?.[0]?.details ?? []
}

// Funding Account — /api/v5/asset/balances (separate from trading account)
async function fetchFundingBalance(cfg: OKXConfig): Promise<OKXDetail[]> {
  const path = '/api/v5/asset/balances'
  const headers = await buildOKXHeaders(cfg, 'GET', path)
  const res = await fetch(`${OKX_BASE}${path}`, { headers })
  if (!res.ok) {
    console.log('[OKX funding] fetch failed:', res.status)
    return []
  }

  const data = await res.json() as { code: string; msg: string; data: OKXAssetBalance[] }
  console.log('[OKX funding] code:', data.code, 'msg:', data.msg, 'count:', data.data?.length ?? 0)
  if (data.code !== '0') {
    console.log('[OKX funding] API error, skipping:', data.code, data.msg)
    return []
  }

  // Convert OKXAssetBalance → OKXDetail shape (no avgPx, no eqUsd from this endpoint)
  return (data.data ?? [])
    .filter((b) => parseFloat(b.bal) > 0)
    .map((b) => ({ ccy: b.ccy, eq: b.bal, eqUsd: '0' }))
}

export async function fetchOKXHoldings(): Promise<HoldingRecord[]> {
  const raw = getConfig<OKXConfig>(STORAGE_KEYS.okx)
  console.log('[OKX] config loaded:', raw ? `apiKey=${raw.apiKey?.slice(0,6)}… secret=${raw.secret ? 'set' : 'missing'}` : 'null')
  if (!raw?.apiKey || !raw?.secret) return []
  const cfg: OKXConfig = {
    apiKey:     raw.apiKey.trim(),
    secret:     raw.secret.trim(),
    passphrase: raw.passphrase?.trim() ?? '',
  }
  if (!cfg.apiKey || !cfg.secret) return []

  // Fetch both accounts in parallel; funding account errors are non-fatal
  const [tradingDetails, fundingDetails] = await Promise.all([
    fetchTradingBalance(cfg),
    fetchFundingBalance(cfg).catch((e) => {
      console.log('[OKX funding] error (non-fatal):', e)
      return [] as OKXDetail[]
    }),
  ])

  // Merge: trading account has eqUsd; funding account entries without eqUsd get filtered out
  // unless they show up in trading too. Deduplicate by ccy, prefer trading account entry.
  const tradingMap = new Map(tradingDetails.map((d) => [d.ccy, d]))
  const merged = [...tradingDetails]
  for (const fd of fundingDetails) {
    if (!tradingMap.has(fd.ccy)) merged.push(fd)
  }

  console.log('[OKX] total merged count:', merged.length)

  // For funding items without USD value, fetch market price from OKX public ticker
  const needsPrice = merged.filter(
    (d) => parseFloat(d.eq) > 0 && parseFloat(d.eqUsd ?? '0') === 0,
  )

  if (needsPrice.length > 0) {
    await Promise.allSettled(
      needsPrice.map(async (d) => {
        // OKSOL → SOL-USDT, BETH → ETH-USDT, otherwise {ccy}-USDT
        const alias: Record<string, string> = { OKSOL: 'SOL', BETH: 'ETH' }
        const baseCcy = alias[d.ccy] ?? d.ccy
        const instId = `${baseCcy}-USDT`
        try {
          const r = await fetch(`${OKX_BASE}/api/v5/market/ticker?instId=${instId}`)
          if (!r.ok) return
          const json = await r.json() as { code: string; data: Array<{ last: string }> }
          if (json.code !== '0' || !json.data?.[0]?.last) return
          const price = parseFloat(json.data[0].last)
          const qty = parseFloat(d.eq)
          d.eqUsd = (qty * price).toString()
          console.log(`[OKX] price lookup ${d.ccy} via ${instId}: $${price} → eqUsd=$${d.eqUsd}`)
        } catch {
          // non-fatal — item stays with eqUsd=0 and gets filtered below
        }
      }),
    )
  }

  merged.forEach((d) => console.log(`[OKX]   ${d.ccy}: eq=${d.eq} eqUsd=${d.eqUsd ?? '0'}`))

  // Filter: has any quantity AND has USD value
  const nonZero = merged.filter(
    (d) => parseFloat(d.eq) > 0 && parseFloat(d.eqUsd ?? '0') > 0.01,
  )

  console.log('[OKX] non-zero (with USD value) count:', nonZero.length)
  return nonZero.map(normalizeOKX)
}
