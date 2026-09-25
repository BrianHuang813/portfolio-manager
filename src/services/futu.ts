// Spec: F2.4 — Futu holdings
// Primary: US positions from futu-bridge (server/futu-bridge), a read-only HTTPS service
// running next to OpenD on an always-on VM. Futu has no cloud API; OpenD is the only gateway.
// Fallback: the legacy Google Sheets tab, used only when the bridge is not configured.

import { getConfig } from '../utils/storage'
import { normalizeFutu, normalizeFutuPosition } from '../utils/normalize'
import type { FutuPosition } from '../utils/normalize'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'

interface FutuBridgeConfig {
  bridgeUrl: string
  token: string
}

interface GSheetsConfig {
  spreadsheetId: string
  sheetsApiKey?: string
}

export interface FutuFetchResult {
  holdings: HoldingRecord[]
  warning: string | null
}

export const FUTU_NOT_CONFIGURED = 'Futu not configured'

export async function fetchFutuHoldings(): Promise<FutuFetchResult> {
  const bridge = getConfig<FutuBridgeConfig>(STORAGE_KEYS.futu)
  if (bridge?.bridgeUrl && bridge.token) return fetchFromBridge(bridge)

  const sheets = getConfig<GSheetsConfig>(STORAGE_KEYS.gsheets)
  if (sheets?.spreadsheetId) return fetchFromSheets(sheets)

  return { holdings: [], warning: `${FUTU_NOT_CONFIGURED} — add your futu-bridge URL and token in Settings.` }
}

// ─── futu-bridge ───────────────────────────────────────────────────────────

async function fetchFromBridge(cfg: FutuBridgeConfig): Promise<FutuFetchResult> {
  const url = `${cfg.bridgeUrl.replace(/\/+$/, '')}/positions`

  let res: Response
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.token}` } })
  } catch (e) {
    return { holdings: [], warning: `Futu: cannot reach futu-bridge — ${String(e)}` }
  }

  if (!res.ok) {
    const detail = await res.json().then((d: { error?: string }) => d.error).catch(() => null)
    const hint = res.status === 401 ? 'check the bridge token in Settings' : detail ?? res.statusText
    return { holdings: [], warning: `Futu: futu-bridge error ${res.status} — ${hint}` }
  }

  const data = await res.json() as { positions: FutuPosition[]; updatedAt: string }
  return {
    holdings: data.positions.map((p) => ({ ...normalizeFutuPosition(p), lastUpdated: data.updatedAt })),
    warning: null,
  }
}

// ─── Google Sheets (legacy) ────────────────────────────────────────────────

async function fetchFromSheets(cfg: GSheetsConfig): Promise<FutuFetchResult> {
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
