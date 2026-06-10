import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchZerionHoldings } from '../services/zerion'

const store: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
})

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key])
  store.cfg_zerion = JSON.stringify({
    apiKey: ' test-api-key ',
    walletAddresses: '0x1234567890abcdef',
  })
})

describe('fetchZerionHoldings', () => {
  it('sends the API key using Zerion Basic authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    await fetchZerionHoldings()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/zerion?address=0x1234567890abcdef',
      { headers: { Authorization: `Basic ${btoa('test-api-key:')}` } },
    )
  })

  it('includes the proxy response when authentication fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Missing Zerion Basic authorization' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(fetchZerionHoldings()).rejects.toThrow(
      '400 {"error":"Missing Zerion Basic authorization"}',
    )
  })
})
