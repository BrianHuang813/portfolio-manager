import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveSnapshot, loadSnapshots } from '../utils/snapshot'

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

describe('snapshot retention', () => {
  it('keeps entries older than 90 days', () => {
    const old = JSON.stringify({ date: '2020-01-01', totalValue: 1000, timestamp: '2020-01-01T00:00:00Z' })
    store.snapshot_history = old
    saveSnapshot(2000)
    expect(loadSnapshots()).toHaveLength(2)
  })
})
