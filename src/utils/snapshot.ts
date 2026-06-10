// Spec: F4.3 — append-only JSONL snapshot history in localStorage
// One entry per calendar day (overwrite same day). History is retained indefinitely.

import { STORAGE_KEYS } from '../config/constants'
import { getRawString, setRawString } from './storage'
import type { DailySnapshot } from '../types/holdings'

export function loadSnapshots(): DailySnapshot[] {
  const raw = getRawString(STORAGE_KEYS.snapshotHistory)
  if (!raw) return []
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as DailySnapshot
      } catch {
        return null
      }
    })
    .filter((s): s is DailySnapshot => s !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function saveSnapshot(totalValue: number): void {
  const today = new Date().toISOString().slice(0, 10)
  const timestamp = new Date().toISOString()
  const existing = getRawString(STORAGE_KEYS.snapshotHistory) ?? ''

  const lines = existing.split('\n').filter(Boolean)
  // Remove today's entry if it exists (overwrite)
  const filtered = lines.filter((l) => {
    try {
      return (JSON.parse(l) as DailySnapshot).date !== today
    } catch {
      return false
    }
  })

  const newEntry = JSON.stringify({ date: today, totalValue, timestamp })
  const valid = [...filtered, newEntry].filter((line) => {
    try {
      JSON.parse(line)
      return true
    } catch {
      return false
    }
  })
  setRawString(STORAGE_KEYS.snapshotHistory, valid.join('\n'))
}

/** Returns the snapshot for a given date string "YYYY-MM-DD", or null */
export function getSnapshotForDate(date: string): DailySnapshot | null {
  return loadSnapshots().find((s) => s.date === date) ?? null
}

/** Returns the snapshot N days ago from today, or null */
export function getSnapshotDaysAgo(days: number): DailySnapshot | null {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return getSnapshotForDate(d.toISOString().slice(0, 10))
}
