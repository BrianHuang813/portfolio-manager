// Spec: F2.4 — Futu data via Google Sheets (read-only)
// Sheet must be publicly readable or use a Sheets API key

import { getConfig } from '../utils/storage'
import { normalizeFutu } from '../utils/normalize'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'

interface GSheetsConfig {
  spreadsheetId: string
  sheetsApiKey?: string
}

export interface FutuFetchResult {
  holdings: HoldingRecord[]
  warning: string | null
}

export async function fetchFutuHoldings(): Promise<FutuFetchResult> {
  const cfg = getConfig<GSheetsConfig>(STORAGE_KEYS.gsheets)

  if (!cfg?.spreadsheetId) {
    return { holdings: [], warning: 'Google Sheets not configured — add spreadsheetId in Settings.' }
  }

  // Accept either a bare ID or a full Google Sheets URL
  const idMatch = cfg.spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  const spreadsheetId = idMatch ? idMatch[1] : cfg.spreadsheetId

  const range = 'Futu!A:K'
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  if (cfg.sheetsApiKey) {
    url += `?key=${cfg.sheetsApiKey}`
  }

  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    return { holdings: [], warning: `Futu: network error — ${String(e)}` }
  }

  if (!res.ok) {
    return {
      holdings: [],
      warning: `Futu: Sheets API error ${res.status}. Make sure the sheet is publicly readable or a sheetsApiKey is configured.`,
    }
  }

  const data = await res.json() as { values?: string[][] }
  const rows = (data.values ?? []).slice(1) // skip header row

  if (rows.length === 0) {
    return { holdings: [], warning: 'No Futu data — run your Python sync script to populate the sheet.' }
  }

  const holdings: HoldingRecord[] = []
  for (const row of rows) {
    try {
      // Pad short rows to avoid normalizeFutu throwing
      const padded = [...row, ...Array(11).fill('')].slice(0, 11)
      const h = normalizeFutu(padded)
      if (h.symbol && h.marketValue >= 0) holdings.push(h)
    } catch {
      // skip malformed rows silently
    }
  }

  return { holdings, warning: null }
}
