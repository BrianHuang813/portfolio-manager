import { describe, it, expect } from 'vitest'
import { normalizeSchwab, normalizeOKX, normalizeZerion, normalizeFutu } from '../utils/normalize'
import type { SchwabPosition, OKXDetail, ZerionPosition } from '../utils/normalize'

describe('normalizeSchwab', () => {
  it('maps a long position correctly', () => {
    const pos: SchwabPosition = {
      instrument: { symbol: 'AAPL', description: 'Apple Inc.', assetType: 'EQUITY' },
      longQuantity: 10,
      averagePrice: 150,
      marketValue: 1700,
    }
    const result = normalizeSchwab(pos)
    expect(result.symbol).toBe('AAPL')
    expect(result.name).toBe('Apple Inc.')
    expect(result.qty).toBe(10)
    expect(result.costBasis).toBe(150)
    expect(result.marketValue).toBe(1700)
    expect(result.unrealizedPL).toBe(200)           // 1700 - (10*150)
    expect(result.unrealizedPLPercent).toBeCloseTo(13.33, 1)
    expect(result.platform).toBe('schwab')
    expect(result.type).toBe('stock')
  })

  it('handles zero cost basis without dividing by zero', () => {
    const pos: SchwabPosition = {
      instrument: { symbol: 'XYZ', assetType: 'EQUITY' },
      longQuantity: 5,
      averagePrice: 0,
      marketValue: 100,
    }
    const result = normalizeSchwab(pos)
    expect(result.unrealizedPLPercent).toBe(0)
  })
})

describe('normalizeOKX', () => {
  it('computes marketValue and PnL correctly', () => {
    const detail: OKXDetail = { ccy: 'BTC', eq: '50000', avgPx: '40000' }
    const result = normalizeOKX(detail, 50000)
    expect(result.symbol).toBe('BTC')
    expect(result.platform).toBe('okx')
    expect(result.type).toBe('crypto')
    expect(result.marketValue).toBe(50000)
    expect(result.qty).toBeCloseTo(1, 4)
    expect(result.unrealizedPL).toBe(10000)         // 50000 - (1 * 40000)
  })

  it('returns zero PnL when avgPx is missing', () => {
    const detail: OKXDetail = { ccy: 'ETH', eq: '3000' }
    const result = normalizeOKX(detail, 3000)
    expect(result.unrealizedPL).toBe(0)
    expect(result.unrealizedPLPercent).toBe(0)
  })
})

describe('normalizeZerion', () => {
  it('filters out spam and maps correctly', () => {
    const pos: ZerionPosition = {
      attributes: {
        value: 1000,
        quantity: { float: 0.5 },
        price: 2000,
        changes: { percent_1d: 2.5 },
        flags: { is_spam: false },
        fungible_info: { symbol: 'ETH', name: 'Ethereum' },
      },
    }
    const result = normalizeZerion(pos, '0xabc123def456')
    expect(result.symbol).toBe('ETH')
    expect(result.name).toBe('Ethereum')
    expect(result.qty).toBe(0.5)
    expect(result.marketValue).toBe(1000)
    expect(result.platform).toBe('zerion')
    expect(result.sourceWallet).toBe('0xabc1...f456')
  })
})

describe('normalizeFutu', () => {
  it('parses a valid 11-column row', () => {
    const row = ['700.HK', 'Tencent', '100', '45.2', '4890', '370', '8.18', 'futu', 'stock', '2026-04-05T10:00:00Z', 'USD']
    const result = normalizeFutu(row)
    expect(result.symbol).toBe('700.HK')
    expect(result.name).toBe('Tencent')
    expect(result.qty).toBe(100)
    expect(result.costBasis).toBe(45.2)
    expect(result.marketValue).toBe(4890)
    expect(result.unrealizedPL).toBe(370)
    expect(result.unrealizedPLPercent).toBe(8.18)
    expect(result.platform).toBe('futu')
    expect(result.type).toBe('stock')
  })

  it('throws for rows with fewer than 11 columns', () => {
    expect(() => normalizeFutu(['AAPL', 'Apple', '10'])).toThrow()
  })
})
