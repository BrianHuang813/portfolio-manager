import { describe, expect, it } from 'vitest'
import { calculateKelly, calculatePositionSizing, defaultPositionStrategy } from '../utils/positionSizing'
import type { HoldingRecord, PositionAssumption } from '../types/holdings'

const assumption: PositionAssumption = { conviction: 0.9, bullMultiple: 7, bearMultiple: 1, note: '' }
const holding = (symbol: string, value = 100): HoldingRecord => ({ symbol, name: symbol, qty: 1, costBasis: value, marketValue: value, unrealizedPL: 0, unrealizedPLPercent: 0, platform: 'schwab', type: 'stock', lastUpdated: '' })

describe('position sizing', () => {
  it('calculates the article half-Kelly OXY example', () => {
    expect(calculateKelly(assumption)).toBeCloseTo(0.8857, 3)
  })

  it('normalizes weights and enforces the position cap', () => {
    const strategy = defaultPositionStrategy()
    strategy.maxPosition = 0.25
    strategy.assumptions = {
      'stock:A': assumption,
      'stock:B': { ...assumption, conviction: 0.8 },
      'stock:C': { ...assumption, conviction: 0.7 },
      'stock:D': { ...assumption, conviction: 0.6 },
    }
    const result = calculatePositionSizing(['A', 'B', 'C', 'D'].map(holding), strategy)
    expect(result.rows.reduce((sum, row) => sum + row.targetWeight, 0)).toBeCloseTo(1, 6)
    expect(Math.max(...result.rows.map((row) => row.targetWeight))).toBeLessThanOrEqual(0.25)
  })

  it('discounts a duplicated correlated bet', () => {
    const strategy = defaultPositionStrategy()
    strategy.maxPosition = 0.5
    strategy.assumptions = { 'stock:A': assumption, 'stock:B': assumption, 'stock:C': assumption }
    strategy.correlations = { 'stock:A': { 'stock:B': 0.8 }, 'stock:B': { 'stock:A': 0.8 } }
    const result = calculatePositionSizing(['A', 'B', 'C'].map(holding), strategy)
    const bySymbol = Object.fromEntries(result.rows.map((row) => [row.holding.symbol, row.targetWeight]))
    expect(bySymbol.C).toBeGreaterThan(bySymbol.A)
  })
})
