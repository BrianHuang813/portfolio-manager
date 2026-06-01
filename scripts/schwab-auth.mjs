#!/usr/bin/env node
/**
 * Schwab OAuth Token Refresh Helper
 *
 * Usage: node scripts/schwab-auth.mjs
 *
 * Flow:
 *   1. Enter App Key + App Secret + your registered Callback URL
 *   2. Browser opens to Schwab authorization page
 *   3. Log in and click Authorize
 *   4. Browser redirects to your callback URL (page may error — that's fine)
 *   5. Copy the full URL from the browser address bar and paste it here
 *   6. Script extracts the code and fetches a new refresh_token
 */

import { exec } from 'child_process'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32' ? `start "" "${url}"` :
    `xdg-open "${url}"`
  exec(cmd)
}

async function exchangeCode(code, redirectUri, appKey, appSecret) {
  const credentials = Buffer.from(`${appKey}:${appSecret}`).toString('base64')

  const res = await fetch('https://api.schwabapi.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Token exchange failed (HTTP ${res.status}): ${text}`)
  }

  return JSON.parse(text)
}

async function main() {
  const rl = createInterface({ input, output })

  console.log('╔══════════════════════════════════════╗')
  console.log('║   Schwab OAuth Token Refresh Helper  ║')
  console.log('╚══════════════════════════════════════╝\n')

  const appKey = (await rl.question('App Key         : ')).trim()
  const appSecret = (await rl.question('App Secret      : ')).trim()
  const redirectUri = (await rl.question('Callback URL    : ')).trim()

  if (!appKey || !appSecret || !redirectUri) {
    console.error('❌ All fields are required.')
    process.exit(1)
  }

  const authUrl =
    'https://api.schwabapi.com/v1/oauth/authorize?' +
    new URLSearchParams({
      client_id: appKey,
      redirect_uri: redirectUri,
      response_type: 'code',
    }).toString()

  console.log('\n🌐 Opening browser — log in to Schwab and click Authorize...')
  openBrowser(authUrl)

  console.log('\nAfter authorizing, the browser will redirect to your Callback URL.')
  console.log('The page may show an error — that\'s fine.')
  console.log('Copy the FULL URL from the browser address bar and paste it below.\n')

  const redirectedUrl = (await rl.question('Paste redirect URL: ')).trim()
  rl.close()

  let code
  try {
    const parsed = new URL(redirectedUrl)
    code = parsed.searchParams.get('code')
    if (!code) throw new Error('No "code" parameter found in URL')
  } catch (err) {
    console.error('❌ Could not parse URL:', err.message)
    process.exit(1)
  }

  console.log('\n🔄 Exchanging authorization code for tokens...')

  let tokens
  try {
    tokens = await exchangeCode(code, redirectUri, appKey, appSecret)
  } catch (err) {
    console.error('\n❌', err.message)
    process.exit(1)
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-TW')

  console.log('\n' + '═'.repeat(52))
  console.log('✅  SUCCESS — your new refresh_token:')
  console.log('═'.repeat(52))
  console.log(tokens.refresh_token)
  console.log('═'.repeat(52))
  console.log(`\n→ 貼到 Settings → Schwab → Refresh Token`)
  console.log(`→ 下次到期日約：${expiresAt}`)
}

main()
