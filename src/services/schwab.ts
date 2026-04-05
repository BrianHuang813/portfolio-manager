// Spec: F2.1 — Charles Schwab Trader API
// Uses refresh_token → access_token exchange only. No OAuth callback.

import { getConfig } from '../utils/storage'
import { normalizeSchwab, type SchwabPosition } from '../utils/normalize'
import { STORAGE_KEYS } from '../config/constants'
import type { HoldingRecord } from '../types/holdings'

interface SchwabConfig {
  appKey: string
  appSecret: string
  refreshToken: string
}

export class SchwabTokenExpiredError extends Error {
  constructor() {
    super('Schwab refresh token is expired or invalid. Please re-authenticate via the Schwab Developer Portal.')
    this.name = 'SchwabTokenExpiredError'
  }
}

async function refreshSchwabToken(cfg: SchwabConfig): Promise<string> {
  const credentials = btoa(`${cfg.appKey}:${cfg.appSecret}`)
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: cfg.refreshToken,
  })

  const res = await fetch('https://api.schwabapi.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (res.status === 400 || res.status === 401) {
    throw new SchwabTokenExpiredError()
  }
  if (!res.ok) {
    throw new Error(`Schwab token refresh failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function getSchwabAccountHashes(accessToken: string): Promise<string[]> {
  const res = await fetch('https://api.schwabapi.com/trader/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Schwab /accounts failed: ${res.status}`)
  const data = await res.json() as Array<{ hashValue: string }>
  return data.map((a) => a.hashValue)
}

async function getSchwabPositions(
  accessToken: string,
  accountHash: string,
): Promise<SchwabPosition[]> {
  const res = await fetch(
    `https://api.schwabapi.com/trader/v1/accounts/${accountHash}?fields=positions`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`Schwab positions failed for ${accountHash}: ${res.status}`)
  const data = await res.json() as { securitiesAccount?: { positions?: SchwabPosition[] } }
  return data.securitiesAccount?.positions ?? []
}

export async function fetchSchwabHoldings(): Promise<HoldingRecord[]> {
  const cfg = getConfig<SchwabConfig>(STORAGE_KEYS.schwab)
  if (!cfg?.appKey || !cfg?.appSecret || !cfg?.refreshToken) return []

  const accessToken = await refreshSchwabToken(cfg)
  const hashes = await getSchwabAccountHashes(accessToken)

  const allPositions = await Promise.all(
    hashes.map((hash) => getSchwabPositions(accessToken, hash)),
  )

  return allPositions
    .flat()
    .filter((p) => (p.longQuantity ?? p.shortQuantity ?? 0) > 0)
    .map(normalizeSchwab)
}
