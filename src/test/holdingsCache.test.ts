import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCachedHoldings, saveCachedHoldings } from '../utils/holdingsCache'
import type { HoldingRecord } from '../types/holdings'

const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
})

const holding: HoldingRecord = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  qty: 1,
  costBasis: 100,
  marketValue: 200,
  unrealizedPL: 100,
  unrealizedPLPercent: 100,
  platform: 'schwab',
  type: 'stock',
  lastUpdated: '2026-06-10T00:00:00.000Z',
}

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key])
})

describe('holdings cache', () => {
  it('persists the last successful holdings per platform', () => {
    saveCachedHoldings('schwab', [holding])

    expect(loadCachedHoldings('schwab')).toEqual([holding])
    expect(loadCachedHoldings('okx')).toBeNull()
  })

  it('overwrites only the selected platform', () => {
    saveCachedHoldings('schwab', [holding])
    saveCachedHoldings('okx', [{ ...holding, symbol: 'BTC', platform: 'okx', type: 'crypto' }])
    saveCachedHoldings('schwab', [])

    expect(loadCachedHoldings('schwab')).toEqual([])
    expect(loadCachedHoldings('okx')?.[0]?.symbol).toBe('BTC')
  })
})
