// Spec: T12 — Zustand UI state
// Manages: selected symbol for news, table filters/sort, per-platform status, Futu warning

import { create } from 'zustand'
import type { AssetType, Platform, PlatformState } from '../types/holdings'

export type SortKey = 'symbol' | 'marketValue' | 'unrealizedPLPercent' | 'platform' | 'type' | 'qty'
export type SortDirection = 'asc' | 'desc'

export interface TableFilters {
  type: AssetType | 'all'
  platform: Platform | 'all'
  search: string
}

interface AppState {
  // News panel
  selectedSymbol: string | null
  selectedSymbolType: AssetType | null
  setSelectedSymbol: (symbol: string | null, type: AssetType | null) => void

  // Table
  tableFilters: TableFilters
  setFilter: (patch: Partial<TableFilters>) => void
  sortConfig: { key: SortKey; direction: SortDirection }
  setSort: (key: SortKey) => void
  tablePage: number
  setTablePage: (page: number) => void

  // Platform status badges
  platformStatus: Record<Platform, PlatformState>
  setPlatformStatus: (platform: Platform, state: Partial<PlatformState>) => void

  // Futu warning message
  futuWarning: string | null
  setFutuWarning: (msg: string | null) => void
}

const defaultPlatformState: PlatformState = {
  status: 'idle',
  lastUpdated: null,
  errorMessage: null,
}

export const useAppStore = create<AppState>((set) => ({
  selectedSymbol: null,
  selectedSymbolType: null,
  setSelectedSymbol: (symbol, type) => set({ selectedSymbol: symbol, selectedSymbolType: type }),

  tableFilters: { type: 'all', platform: 'all', search: '' },
  setFilter: (patch) =>
    set((s) => ({ tableFilters: { ...s.tableFilters, ...patch }, tablePage: 0 })),

  sortConfig: { key: 'marketValue', direction: 'desc' },
  setSort: (key) =>
    set((s) => ({
      sortConfig: {
        key,
        direction: s.sortConfig.key === key && s.sortConfig.direction === 'desc' ? 'asc' : 'desc',
      },
    })),

  tablePage: 0,
  setTablePage: (page) => set({ tablePage: page }),

  platformStatus: {
    schwab: { ...defaultPlatformState },
    okx: { ...defaultPlatformState },
    zerion: { ...defaultPlatformState },
    futu: { ...defaultPlatformState },
  },
  setPlatformStatus: (platform, state) =>
    set((s) => ({
      platformStatus: {
        ...s.platformStatus,
        [platform]: { ...s.platformStatus[platform], ...state },
      },
    })),

  futuWarning: null,
  setFutuWarning: (msg) => set({ futuWarning: msg }),
}))
