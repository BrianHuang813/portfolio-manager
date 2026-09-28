// Spec: F2.4 — Futu holdings
// Primary: US positions from futu-bridge (server/futu-bridge), a read-only HTTPS service
// running next to OpenD on an always-on VM. Futu has no cloud API; OpenD is the only gateway.

import { getConfig } from '../utils/storage'
import { normalizeFutuPosition } from '../utils/normalize'
import type { FutuPosition } from '../utils/normalize'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'
import { fetchManualHoldings } from './manual'

interface FutuBridgeConfig {
  bridgeUrl: string
  token: string
}

export interface FutuFetchResult {
  holdings: HoldingRecord[]
  warning: string | null
}

export const FUTU_NOT_CONFIGURED = 'Futu not configured'

// Manual holdings are grouped with Futu
export async function fetchFutuHoldings(): Promise<FutuFetchResult> {
  const [result, manual] = await Promise.all([fetchFutuSource(), fetchManualHoldings()])
  return { ...result, holdings: [...result.holdings, ...manual] }
}

async function fetchFutuSource(): Promise<FutuFetchResult> {
  const bridge = getConfig<FutuBridgeConfig>(STORAGE_KEYS.futu)
  if (bridge?.bridgeUrl && bridge.token) return fetchFromBridge(bridge)

  return { holdings: [], warning: `${FUTU_NOT_CONFIGURED} — add your futu-bridge URL and token in Settings.` }
}

// ─── futu-bridge ───────────────────────────────────────────────────────────

async function fetchFromBridge(cfg: FutuBridgeConfig): Promise<FutuFetchResult> {
  const url = `${cfg.bridgeUrl.trim().replace(/\/+$/, '')}/positions`

  let res: Response
  try {
    // Tokens are pasted from a terminal, which often adds stray whitespace
    res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.token.trim()}` } })
  } catch (e) {
    // Browsers report a CORS rejection as a bare network error, so point at the likely fix
    return {
      holdings: [],
      warning: `Futu: cannot reach futu-bridge (${String(e)}) — check the Bridge URL, and that ALLOWED_ORIGINS on the VM includes ${window.location.origin}`,
    }
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
