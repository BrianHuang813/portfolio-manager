import type { HoldingRecord, PositionAssumption, PositionStrategy } from '../types/holdings'

export interface SizingRow {
  key: string
  holding: HoldingRecord
  assumption: PositionAssumption | null
  kelly: number
  halfKelly: number
  correlationAdjusted: number
  targetWeight: number
  currentWeight: number
  deltaWeight: number
  deltaValue: number
}

export interface SizingResult {
  rows: SizingRow[]
  warnings: string[]
  totalValue: number
  targetExposure: number
}

export const holdingKey = (holding: Pick<HoldingRecord, 'symbol' | 'type'>) =>
  `${holding.type}:${holding.symbol.toUpperCase()}`

export const defaultPositionStrategy = (): PositionStrategy => ({
  fractionalKelly: 0.5,
  targetExposure: 1,
  maxPosition: 0.25,
  rebalanceTolerance: 0.02,
  assumptions: {},
  correlations: {},
})

export function calculateKelly(assumption: PositionAssumption): number {
  if (assumption.conviction <= 0 || assumption.conviction >= 1 || assumption.bullMultiple <= 0 || assumption.bearMultiple <= 0) return 0
  const b = assumption.bullMultiple / assumption.bearMultiple
  return Math.max(0, assumption.conviction - (1 - assumption.conviction) / b)
}

function correlationFor(strategy: PositionStrategy, left: string, right: string): number {
  if (left === right) return 1
  const value = strategy.correlations[left]?.[right] ?? strategy.correlations[right]?.[left] ?? 0
  return Math.max(-0.99, Math.min(0.99, value))
}

function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length
  const augmented = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0),
  ])

  for (let column = 0; column < n; column += 1) {
    let pivot = column
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null
    ;[augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]
    const divisor = augmented[column][column]
    augmented[column] = augmented[column].map((value) => value / divisor)
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue
      const factor = augmented[row][column]
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index])
    }
  }
  return augmented.map((row) => row.slice(n))
}

function capAndRedistribute(weights: number[], targetExposure: number, maxPosition: number): number[] {
  const capped = weights.map((weight) => Math.min(weight, maxPosition))
  let remaining = targetExposure - capped.reduce((sum, weight) => sum + weight, 0)

  while (remaining > 1e-8) {
    const eligible = capped.map((weight, index) => weight < maxPosition - 1e-8 ? index : -1).filter((index) => index >= 0)
    if (!eligible.length) break
    const base = eligible.reduce((sum, index) => sum + weights[index], 0)
    let distributed = 0
    eligible.forEach((index) => {
      const share = base > 0 ? weights[index] / base : 1 / eligible.length
      const add = Math.min(remaining * share, maxPosition - capped[index])
      capped[index] += add
      distributed += add
    })
    if (distributed < 1e-10) break
    remaining -= distributed
  }
  return capped
}

export function calculatePositionSizing(holdings: HoldingRecord[], strategy: PositionStrategy): SizingResult {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0)
  const active = holdings.map((holding) => ({
    holding,
    key: holdingKey(holding),
    assumption: strategy.assumptions[holdingKey(holding)] ?? null,
  })).filter((entry) => entry.assumption !== null)
  const warnings: string[] = []
  const utility = active.map(({ assumption }) => calculateKelly(assumption!) * strategy.fractionalKelly)
  const matrix = active.map(({ key: left }) => active.map(({ key: right }) => correlationFor(strategy, left, right)))
  const inverse = active.length ? invertMatrix(matrix) : []

  if (active.length > 0 && !inverse) warnings.push('Correlation matrix is not invertible. Correlation adjustment is disabled.')
  if (strategy.maxPosition * active.length < strategy.targetExposure - 1e-8) warnings.push('The position cap is too low to reach the target exposure with the configured positions.')

  const adjusted = inverse
    ? inverse.map((row) => Math.max(0, row.reduce((sum, value, index) => sum + value * utility[index], 0)))
    : utility
  const adjustedTotal = adjusted.reduce((sum, value) => sum + value, 0)
  if (active.length > 0 && adjustedTotal === 0) warnings.push('No positive Kelly weight is available. Review conviction and payoff assumptions.')
  const normalized = adjustedTotal > 0
    ? adjusted.map((value) => value / adjustedTotal * strategy.targetExposure)
    : adjusted.map(() => 0)
  const finalWeights = capAndRedistribute(normalized, strategy.targetExposure, strategy.maxPosition)
  const byKey = new Map(active.map((entry, index) => [entry.key, {
    assumption: entry.assumption,
    kelly: calculateKelly(entry.assumption!),
    halfKelly: utility[index],
    correlationAdjusted: adjusted[index],
    targetWeight: finalWeights[index],
  }]))

  const rows = holdings.map((holding) => {
    const key = holdingKey(holding)
    const calculated = byKey.get(key)
    const currentWeight = totalValue > 0 ? holding.marketValue / totalValue : 0
    const targetWeight = calculated?.targetWeight ?? 0
    return {
      key,
      holding,
      assumption: calculated?.assumption ?? null,
      kelly: calculated?.kelly ?? 0,
      halfKelly: calculated?.halfKelly ?? 0,
      correlationAdjusted: calculated?.correlationAdjusted ?? 0,
      targetWeight,
      currentWeight,
      deltaWeight: targetWeight - currentWeight,
      deltaValue: (targetWeight - currentWeight) * totalValue,
    }
  })
  return { rows, warnings, totalValue, targetExposure: strategy.targetExposure }
}
