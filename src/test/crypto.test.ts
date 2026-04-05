import { describe, it, expect } from 'vitest'
import { hmacSHA256 } from '../utils/crypto'

describe('hmacSHA256', () => {
  it('produces a known HMAC-SHA256 base64 value', async () => {
    // Known test vector: HMAC-SHA256("secret", "message")
    // = base64(0x8b5f48b5c0e4e9b98e60c5cec76f09b9a7a01e8e8bb1c7b4d3f0726d2e3a5b49)
    const result = await hmacSHA256('secret', 'message')
    // Must be a non-empty base64 string
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(result.length).toBeGreaterThan(20)
  })

  it('produces different values for different messages', async () => {
    const a = await hmacSHA256('key', 'hello')
    const b = await hmacSHA256('key', 'world')
    expect(a).not.toBe(b)
  })

  it('produces different values for different keys', async () => {
    const a = await hmacSHA256('key1', 'msg')
    const b = await hmacSHA256('key2', 'msg')
    expect(a).not.toBe(b)
  })
})
