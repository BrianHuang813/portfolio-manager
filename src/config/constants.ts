// Spec: Non-Functional Requirements

/** Auto-refresh interval: 10 minutes */
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000

/** Finnhub news React Query stale time: 30 minutes */
export const NEWS_STALE_MS = 30 * 60 * 1000

/** Holdings table rows per page */
export const TABLE_PAGE_SIZE = 20

/** News articles shown per symbol */
export const MAX_NEWS_ARTICLES = 10

/** localStorage keys */
export const STORAGE_KEYS = {
  schwab: 'cfg_schwab',
  okx: 'cfg_okx',
  zerion: 'cfg_zerion',
  finnhub: 'cfg_finnhub',
  futu: 'cfg_futu',
  manualHoldings: 'cfg_manual_holdings',
  manualLastPrices: 'manual_last_prices',
  snapshotHistory: 'snapshot_history',
  holdingsCache: 'holdings_cache',
  positionStrategy: 'position_strategy',
} as const
