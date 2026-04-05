// Spec: F2.2 — Web Crypto API HMAC-SHA256 for OKX request signing
// Uses crypto.subtle (built-in browser API, no external library)

/**
 * Compute HMAC-SHA256 of `message` using `secret`, returning base64 string.
 *
 * OKX usage:
 *   const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
 *   const message = ts + 'GET' + '/api/v5/account/balance' + ''
 *   const signature = await hmacSHA256(secret, message)
 */
export async function hmacSHA256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

/**
 * Returns OKX-format timestamp: "2026-04-05T14:22:00Z" (no milliseconds)
 */
export function okxTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}
