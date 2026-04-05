// Spec: Non-Functional Requirements

/** Auto-refresh interval: 10 minutes */
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000

/** Maximum days of daily snapshots to retain in localStorage */
export const MAX_SNAPSHOT_DAYS = 90

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
  gsheets: 'cfg_gsheets',
  snapshotHistory: 'snapshot_history',
} as const
