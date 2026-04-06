// Spec: F3 — per-platform raw response → HoldingRecord mappers

import type { HoldingRecord } from '../types/holdings'

// ─── Schwab ────────────────────────────────────────────────────────────────

export interface SchwabPosition {
  instrument: {
    symbol: string
    description?: string
    assetType: string
  }
  longQuantity?: number
  shortQuantity?: number
  averagePrice?: number
  marketValue?: number
  currentDayProfitLoss?: number
  currentDayProfitLossPercentage?: number
}

export function normalizeSchwab(pos: SchwabPosition): HoldingRecord {
  const qty = pos.longQuantity ?? pos.shortQuantity ?? 0
  const costBasis = pos.averagePrice ?? 0
  const marketValue = pos.marketValue ?? 0
  const cost = qty * costBasis
  const unrealizedPL = marketValue - cost
  const unrealizedPLPercent = cost > 0 ? (unrealizedPL / cost) * 100 : 0

  return {
    symbol: pos.instrument.symbol,
    name: pos.instrument.description ?? pos.instrument.symbol,
    qty,
    costBasis,
    marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    platform: 'schwab',
    type: 'stock',
    lastUpdated: new Date().toISOString(),
  }
}

// ─── OKX ───────────────────────────────────────────────────────────────────

export interface OKXDetail {
  ccy: string
  eq: string      // quantity in currency terms (e.g. 0.001 BTC)
  eqUsd: string   // total USD value (e.g. 45.23)
  avgPx?: string  // average open price in USD per unit
}

export function normalizeOKX(detail: OKXDetail): HoldingRecord {
  const qty = parseFloat(detail.eq) || 0
  const marketValue = parseFloat(detail.eqUsd ?? '0') || 0
  const costBasis = parseFloat(detail.avgPx ?? '0') || 0
  const cost = qty * costBasis
  const unrealizedPL = cost > 0 ? marketValue - cost : 0
  const unrealizedPLPercent = cost > 0 ? (unrealizedPL / cost) * 100 : 0

  return {
    symbol: detail.ccy,
    name: detail.ccy,
    qty,
    costBasis,
    marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    platform: 'okx',
    type: 'crypto',
    lastUpdated: new Date().toISOString(),
  }
}

// ─── Zerion ────────────────────────────────────────────────────────────────

export interface ZerionPositionAttributes {
  value: number | null
  quantity: { float: number } | null
  price: number | null
  changes: { percent_1d: number | null } | null
  flags: { is_spam: boolean }
  fungible_info: {
    symbol: string
    name: string
  }
}

export interface ZerionPosition {
  attributes: ZerionPositionAttributes
}

export function normalizeZerion(pos: ZerionPosition, walletAddress: string): HoldingRecord {
  const { attributes } = pos
  const symbol = attributes.fungible_info.symbol ?? ''
  const name = attributes.fungible_info.name ?? symbol
  const qty = attributes.quantity?.float ?? 0
  const marketValue = attributes.value ?? 0
  // Zerion doesn't provide cost basis; default to 0 (PnL unavailable)
  const costBasis = 0
  const unrealizedPL = 0
  const unrealizedPLPercent = 0

  const short = walletAddress.length > 10
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : walletAddress

  return {
    symbol,
    name,
    qty,
    costBasis,
    marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    platform: 'zerion',
    type: 'crypto',
    lastUpdated: new Date().toISOString(),
    sourceWallet: short,
  }
}

// ─── Futu (Google Sheets row) ──────────────────────────────────────────────

/** Columns A–K as defined in Futu Sheet Schema (spec F2.4) */
export function normalizeFutu(row: string[]): HoldingRecord {
  if (row.length < 11) {
    throw new Error(`Futu row has ${row.length} columns, expected 11: ${JSON.stringify(row)}`)
  }
  const [symbol, name, qty, costBasis, marketValue, unrealizedPL, unrealizedPLPercent, , type, lastUpdated] = row

  return {
    symbol: symbol ?? '',
    name: name ?? '',
    qty: parseFloat(qty ?? '0') || 0,
    costBasis: parseFloat(costBasis ?? '0') || 0,
    marketValue: parseFloat(marketValue ?? '0') || 0,
    unrealizedPL: parseFloat(unrealizedPL ?? '0') || 0,
    unrealizedPLPercent: parseFloat(unrealizedPLPercent ?? '0') || 0,
    platform: 'futu',
    type: (type === 'crypto' ? 'crypto' : 'stock'),
    lastUpdated: lastUpdated ?? new Date().toISOString(),
  }
}
