// Zerion positions — routes through /api/zerion Vercel proxy to avoid CORS
// API key is sent via X-Zerion-Key header, never in the URL

import { getConfig } from '../utils/storage'
import { normalizeZerion, type ZerionPosition } from '../utils/normalize'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'

interface ZerionConfig {
  apiKey: string
  walletAddresses: string
}

interface ZerionResponse {
  data: ZerionPosition[]
}

async function fetchWalletPositions(
  address: string,
  apiKey: string,
): Promise<ZerionPosition[]> {
  // Always use the server-side proxy — avoids CORS regardless of environment
  const url = `/api/zerion?address=${encodeURIComponent(address)}`

  const res = await fetch(url, {
    headers: {
      'X-Zerion-Key': apiKey,
    },
  })

  if (!res.ok) throw new Error(`Zerion fetch failed for ${address}: ${res.status}`)
  const data = await res.json() as ZerionResponse
  return data.data ?? []
}

export async function fetchZerionHoldings(): Promise<HoldingRecord[]> {
  const cfg = getConfig<ZerionConfig>(STORAGE_KEYS.zerion)
  if (!cfg?.apiKey || !cfg?.walletAddresses) return []

  const addresses = cfg.walletAddresses
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    // Zerion only supports EVM addresses (0x...) — skip Bitcoin/Solana native addresses
    .filter((a) => {
      if (!a.startsWith('0x')) {
        console.log(`[Zerion] skipping non-EVM address: ${a.slice(0, 12)}…`)
        return false
      }
      return true
    })

  if (addresses.length === 0) return []

  // Fetch sequentially to avoid hitting Zerion rate limits (429)
  const results: PromiseSettledResult<ZerionPosition[]>[] = []
  for (let i = 0; i < addresses.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600)) // 600ms between requests
    results.push(await Promise.resolve().then(() =>
      fetchWalletPositions(addresses[i]!, cfg.apiKey)
        .then((v) => ({ status: 'fulfilled' as const, value: v }))
        .catch((e) => ({ status: 'rejected' as const, reason: e })),
    ))
  }

  const holdings: HoldingRecord[] = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      result.value
        .filter((p) => !p.attributes.flags.is_spam)
        .filter((p) => (p.attributes.value ?? 0) > 0.01)
        .forEach((p) => holdings.push(normalizeZerion(p, addresses[i]!)))
    }
  })

  return holdings
}
