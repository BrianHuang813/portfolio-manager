import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveSnapshot, loadSnapshots, pruneOldSnapshots } from '../utils/snapshot'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
})

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
})

describe('saveSnapshot', () => {
  it('saves and loads a snapshot', () => {
    saveSnapshot(100_000)
    const snaps = loadSnapshots()
    expect(snaps).toHaveLength(1)
    expect(snaps[0]!.totalValue).toBe(100_000)
  })

  it('deduplicates same-day snapshots (overwrites)', () => {
    saveSnapshot(100_000)
    saveSnapshot(105_000)
    const snaps = loadSnapshots()
    expect(snaps).toHaveLength(1)
    expect(snaps[0]!.totalValue).toBe(105_000)
  })
})

describe('pruneOldSnapshots', () => {
  it('removes entries older than 90 days', () => {
    const old = JSON.stringify({ date: '2020-01-01', totalValue: 1000, timestamp: '2020-01-01T00:00:00Z' })
    const recent = JSON.stringify({ date: new Date().toISOString().slice(0, 10), totalValue: 2000, timestamp: new Date().toISOString() })
    const result = pruneOldSnapshots([old, recent])
    expect(result).toHaveLength(1)
    expect(JSON.parse(result[0]!).totalValue).toBe(2000)
  })

  it('keeps entries within 90 days', () => {
    const d = new Date()
    d.setDate(d.getDate() - 45)
    const mid = JSON.stringify({ date: d.toISOString().slice(0, 10), totalValue: 5000, timestamp: d.toISOString() })
    const result = pruneOldSnapshots([mid])
    expect(result).toHaveLength(1)
  })
})
