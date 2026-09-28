// Manually entered positions (e.g. a stock held through a sub-brokerage account with no API).
// Quantity and cost are fixed in Settings; the price comes from Finnhub so value and PnL stay live.
// Entered as "SYMBOL:qty@costBasis", comma-separated — e.g. "TSLA:13@207.9".

import { getConfig, getRawString, setRawString } from '../utils/storage'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'

export interface ManualHolding {
  symbol: string
  qty: number
  costBasis: number
}

interface ManualConfig {
  holdings: string
}

interface FinnhubConfig {
  apiKey: string
}

export function parseManualHoldings(input: string): ManualHolding[] {
  const result: ManualHolding[] = []
  for (const part of input.split(',')) {
    const m = /^\s*([A-Za-z0-9.\-]+)\s*:\s*([\d.]+)\s*@\s*([\d.]+)\s*$/.exec(part)
    if (!m) continue
    const qty = Number(m[2])
    const costBasis = Number(m[3])
    if (qty > 0 && Number.isFinite(costBasis)) result.push({ symbol: m[1].toUpperCase(), qty, costBasis })
  }
  return result
}

export function toManualHoldingRecord(h: ManualHolding, price: number): HoldingRecord {
  const marketValue = h.qty * price
  const cost = h.qty * h.costBasis
  const unrealizedPL = marketValue - cost
  return {
    symbol: h.symbol,
    name: h.symbol,
    qty: h.qty,
    costBasis: h.costBasis,
    marketValue,
    unrealizedPL,
    unrealizedPLPercent: cost > 0 ? (unrealizedPL / cost) * 100 : 0,
    platform: 'futu',
    type: 'stock',
    lastUpdated: new Date().toISOString(),
  }
}

function loadLastPrices(): Record<string, number> {
  try {
    return JSON.parse(getRawString(STORAGE_KEYS.manualLastPrices) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

async function fetchQuote(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`)
    if (!res.ok) return null
    const data = await res.json() as { c?: number }
    // Finnhub answers unknown symbols with c = 0
    return data.c && data.c > 0 ? data.c : null
  } catch {
    return null
  }
}

/** Never throws: falls back to the last fetched price, then to cost basis, so the position never drops out */
export async function fetchManualHoldings(): Promise<HoldingRecord[]> {
  const holdings = parseManualHoldings(getConfig<ManualConfig>(STORAGE_KEYS.manualHoldings)?.holdings ?? '')
  if (holdings.length === 0) return []

  const apiKey = getConfig<FinnhubConfig>(STORAGE_KEYS.finnhub)?.apiKey
  const lastPrices = loadLastPrices()

  const records = await Promise.all(holdings.map(async (h) => {
    const live = apiKey ? await fetchQuote(h.symbol, apiKey) : null
    if (live !== null) lastPrices[h.symbol] = live
    else console.warn(`Manual holding ${h.symbol}: no live quote, using ${lastPrices[h.symbol] ? 'last known price' : 'cost basis'}`)
    return toManualHoldingRecord(h, live ?? lastPrices[h.symbol] ?? h.costBasis)
  }))

  try {
    setRawString(STORAGE_KEYS.manualLastPrices, JSON.stringify(lastPrices))
  } catch {
    // storage unavailable (private mode / quota) — the fallback price just won't persist
  }
  return records
}
