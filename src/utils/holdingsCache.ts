import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord, Platform } from '../types/holdings'
import { getConfig, setConfig } from './storage'

interface PlatformHoldingsCache {
  holdings: HoldingRecord[]
  savedAt: string
}

type HoldingsCache = Partial<Record<Platform, PlatformHoldingsCache>>

function loadCache(): HoldingsCache {
  return getConfig<HoldingsCache>(STORAGE_KEYS.holdingsCache) ?? {}
}

export function loadCachedHoldings(platform: Platform): HoldingRecord[] | null {
  const entry = loadCache()[platform]
  if (!entry || !Array.isArray(entry.holdings)) return null
  return entry.holdings
}

export function saveCachedHoldings(
  platform: Platform,
  holdings: HoldingRecord[],
): void {
  const cache = loadCache()
  cache[platform] = {
    holdings,
    savedAt: new Date().toISOString(),
  }
  setConfig(STORAGE_KEYS.holdingsCache, cache)
}
