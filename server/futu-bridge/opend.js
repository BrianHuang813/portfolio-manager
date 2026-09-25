// Fetches US-market positions from a local OpenD through its WebSocket port (futu-api SDK)

import FtWebsocket from 'futu-api'

const LOGIN_TIMEOUT_MS = 8000
const TRD_ENV_REAL = 1
const TRD_MARKET_US = 2
const TRD_SEC_MARKET_US = 2
const ACC_STATUS_ACTIVE = 0

/** Opens a short-lived OpenD session; always closes it so the SDK's auto-reconnect never loops */
async function withOpenD({ host, port, key }, fn) {
  const ws = new FtWebsocket()
  const addr = `${host}:${port}`
  try {
    await new Promise((resolve, reject) => {
      const unreachable = () => {
        clearTimeout(timer)
        reject(new Error(`cannot reach OpenD at ws://${addr} — is it running with websocket_port enabled?`))
      }
      const timer = setTimeout(unreachable, LOGIN_TIMEOUT_MS)
      ws.onlogin = (ok, msg) => {
        clearTimeout(timer)
        if (ok) resolve()
        else reject(new Error(`OpenD rejected the connection (${describeError(msg)}) — check FUTU_WEBSOCKET_KEY`))
      }
      ws.start(host, port, false, key || undefined)
      // Fail on the first socket error instead of waiting out the SDK's 1s reconnect loop
      if (ws.websock) ws.websock.onerror = unreachable
    })
    return await fn(ws)
  } finally {
    ws.stop()
    ws.websock?.close()
  }
}

function describeError(e) {
  if (e && typeof e === 'object' && 'retMsg' in e) return String(e.retMsg)
  return String(e)
}

// protobufjs exposes missing optional fields as prototype defaults (0), hence || rather than ??
function toPlain(p) {
  return {
    positionID: String(p.positionID),
    code: p.code,
    name: p.name,
    qty: p.qty,
    val: p.val,
    plVal: p.plVal,
    dilutedCostPrice: p.dilutedCostPrice || undefined,
    averageCostPrice: p.averageCostPrice || undefined,
    costPrice: p.costPrice || undefined,
    secMarket: p.secMarket || undefined,
  }
}

export async function fetchUsPositions(opendConfig) {
  return withOpenD(opendConfig, async (ws) => {
    const accRes = await ws.GetAccList({ c2s: { userID: 0, needGeneralSecAccount: true } })
      .catch((e) => { throw new Error(`GetAccList failed: ${describeError(e)}`) })
    const accounts = accRes.s2c?.accList ?? []
    const usAccounts = accounts.filter((a) =>
      a.trdEnv === TRD_ENV_REAL
      && a.accStatus === ACC_STATUS_ACTIVE
      && a.trdMarketAuthList.includes(TRD_MARKET_US))
    if (usAccounts.length === 0) throw new Error('no real US trading account found — is OpenD logged in?')

    // A universal account and a legacy US account may report the same positions — dedupe by positionID
    const seen = new Set()
    const positions = []
    for (const acc of usAccounts) {
      const res = await ws.GetPositionList({
        c2s: { header: { trdEnv: acc.trdEnv, accID: acc.accID, trdMarket: TRD_MARKET_US } },
      }).catch((e) => { throw new Error(`GetPositionList failed: ${describeError(e)}`) })
      for (const p of res.s2c?.positionList ?? []) {
        if (p.qty === 0) continue
        if (p.secMarket && p.secMarket !== TRD_SEC_MARKET_US) continue
        const id = String(p.positionID)
        if (seen.has(id)) continue
        seen.add(id)
        positions.push(toPlain(p))
      }
    }
    return positions
  })
}
