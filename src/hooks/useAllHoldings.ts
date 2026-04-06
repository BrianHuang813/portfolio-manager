// Spec: F2.5, T13 — orchestrates all 4 platform fetches via Promise.allSettled
// Updates Zustand platformStatus per result; saves JSONL snapshot on success.

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchSchwabHoldings } from '../services/schwab'
import { fetchOKXHoldings } from '../services/okx'
import { fetchZerionHoldings } from '../services/zerion'
import { fetchFutuHoldings } from '../services/futu'
import { fetchBitcoinHoldings } from '../services/bitcoin'
import { saveSnapshot } from '../utils/snapshot'
import { useAppStore } from '../store/useAppStore'
import { REFRESH_INTERVAL_MS } from '../config/constants'
import type { HoldingRecord, Platform } from '../types/holdings'

interface FetchResult {
  holdings: HoldingRecord[]
  platformErrors: Partial<Record<Platform, string>>
  futuWarning: string | null
}

async function fetchAllHoldings(): Promise<FetchResult> {
  const [schwabResult, okxResult, zerionResult, futuResult, bitcoinResult] = await Promise.allSettled([
    fetchSchwabHoldings(),
    fetchOKXHoldings(),
    fetchZerionHoldings(),
    fetchFutuHoldings(),
    fetchBitcoinHoldings(),
  ])

  const holdings: HoldingRecord[] = []
  const platformErrors: Partial<Record<Platform, string>> = {}
  let futuWarning: string | null = null

  if (schwabResult.status === 'fulfilled') {
    holdings.push(...schwabResult.value)
  } else {
    platformErrors.schwab = schwabResult.reason instanceof Error
      ? schwabResult.reason.message
      : String(schwabResult.reason)
  }

  if (okxResult.status === 'fulfilled') {
    holdings.push(...okxResult.value)
  } else {
    platformErrors.okx = okxResult.reason instanceof Error
      ? okxResult.reason.message
      : String(okxResult.reason)
  }

  if (zerionResult.status === 'fulfilled') {
    holdings.push(...zerionResult.value)
  } else {
    platformErrors.zerion = zerionResult.reason instanceof Error
      ? zerionResult.reason.message
      : String(zerionResult.reason)
  }

  if (futuResult.status === 'fulfilled') {
    holdings.push(...futuResult.value.holdings)
    futuWarning = futuResult.value.warning
  } else {
    platformErrors.futu = futuResult.reason instanceof Error
      ? futuResult.reason.message
      : String(futuResult.reason)
  }

  if (bitcoinResult.status === 'fulfilled') {
    holdings.push(...bitcoinResult.value)
  } else {
    platformErrors.bitcoin = bitcoinResult.reason instanceof Error
      ? bitcoinResult.reason.message
      : String(bitcoinResult.reason)
  }

  return { holdings, platformErrors, futuWarning }
}

export function useAllHoldings() {
  const setPlatformStatus = useAppStore((s) => s.setPlatformStatus)
  const setFutuWarning = useAppStore((s) => s.setFutuWarning)

  // Set all platforms to loading before fetch
  const query = useQuery<FetchResult>({
    queryKey: ['holdings'],
    queryFn: fetchAllHoldings,
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
    retry: 2,
  })

  useEffect(() => {
    if (query.isFetching) {
      const platforms: Platform[] = ['schwab', 'okx', 'zerion', 'futu', 'bitcoin']
      platforms.forEach((p) => setPlatformStatus(p, { status: 'loading', errorMessage: null }))
    }
  }, [query.isFetching, setPlatformStatus])

  useEffect(() => {
    if (!query.data) return
    const now = new Date().toISOString()
    const { platformErrors, futuWarning } = query.data
    const platforms: Platform[] = ['schwab', 'okx', 'zerion', 'futu', 'bitcoin']

    platforms.forEach((p) => {
      if (platformErrors[p]) {
        setPlatformStatus(p, { status: 'error', errorMessage: platformErrors[p]! })
      } else {
        setPlatformStatus(p, { status: 'success', lastUpdated: now, errorMessage: null })
      }
    })

    setFutuWarning(futuWarning)

    // Save daily snapshot
    const total = query.data.holdings.reduce((sum, h) => sum + h.marketValue, 0)
    if (total > 0) saveSnapshot(total)
  }, [query.data, setPlatformStatus, setFutuWarning])

  return {
    holdings: query.data?.holdings ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  }
}
