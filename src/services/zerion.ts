// Spec: F2.3 — Zerion API v1, multi-wallet aggregated
// Basic Auth: apiKey as username, empty password

import { getConfig } from '../utils/storage'
import { normalizeZerion, type ZerionPosition } from '../utils/normalize'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'

interface ZerionConfig {
  apiKey: string
  walletAddresses: string // comma-separated
}

interface ZerionResponse {
  data: ZerionPosition[]
}

async function fetchWalletPositions(
  address: string,
  apiKey: string,
): Promise<ZerionPosition[]> {
  const auth = btoa(`${apiKey}:`)
  const url = `https://api.zerion.io/v1/wallets/${address}/positions/?filter[positions]=only_simple&currency=usd&filter[trash]=only_non_trash&sort=value`

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
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

  if (addresses.length === 0) return []

  const results = await Promise.allSettled(
    addresses.map((addr) => fetchWalletPositions(addr, cfg.apiKey)),
  )

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
