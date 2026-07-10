import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { STORAGE_KEYS } from '../config/constants'
import { useAllHoldings } from '../hooks/useAllHoldings'
import type { PositionAssumption, PositionStrategy } from '../types/holdings'
import { getConfig, setConfig } from '../utils/storage'
import { calculatePositionSizing, defaultPositionStrategy } from '../utils/positionSizing'

const pct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const initialAssumption: PositionAssumption = { conviction: 0.6, bullMultiple: 1, bearMultiple: 0.5, note: '' }

function asNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function PositionManagement() {
  const { holdings, isLoading } = useAllHoldings()
  const [strategy, setStrategy] = useState<PositionStrategy>(defaultPositionStrategy)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = getConfig<PositionStrategy>(STORAGE_KEYS.positionStrategy)
    if (saved) setStrategy({ ...defaultPositionStrategy(), ...saved })
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) setConfig(STORAGE_KEYS.positionStrategy, strategy)
  }, [loaded, strategy])

  const result = useMemo(() => calculatePositionSizing(holdings, strategy), [holdings, strategy])
  const configured = result.rows.filter((row) => row.assumption)
  const correlationPairs = configured.flatMap((row, rowIndex) =>
    configured.slice(rowIndex + 1).map((other) => [row.key, other.key] as const),
  )
  const unconfigured = result.rows.length - configured.length
  const totalTarget = result.rows.reduce((sum, row) => sum + row.targetWeight, 0)

  const updateStrategy = (patch: Partial<PositionStrategy>) => setStrategy((current) => ({ ...current, ...patch }))
  const updateAssumption = (key: string, patch: Partial<PositionAssumption>) => setStrategy((current) => ({
    ...current,
    assumptions: { ...current.assumptions, [key]: { ...(current.assumptions[key] ?? initialAssumption), ...patch } },
  }))
  const updateCorrelation = (left: string, right: string, value: number) => setStrategy((current) => ({
    ...current,
    correlations: {
      ...current.correlations,
      [left]: { ...current.correlations[left], [right]: value },
      [right]: { ...current.correlations[right], [left]: value },
    },
  }))
  const resetStrategy = () => setStrategy(defaultPositionStrategy())

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-body text-label-sm text-muted uppercase tracking-[0.12em] mb-2">Portfolio construction</p>
          <h1 className="font-display font-bold text-display-md text-primary leading-none">Position Management</h1>
        </div>
        <div className="flex gap-6 font-body text-label-md">
          <div><span className="block text-muted uppercase tracking-[0.08em] text-label-sm">Target exposure</span><span className="text-primary tabular-nums">{pct.format(totalTarget)}</span></div>
          <div className="blade-left pl-6"><span className="block text-muted uppercase tracking-[0.08em] text-label-sm">Positions modeled</span><span className="text-primary tabular-nums">{configured.length}/{result.rows.length}</span></div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-8">
        <div className="bg-cl p-6 space-y-6 blade-left-gain">
          <div>
            <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-1">Strategy controls</p>
            <h2 className="font-display font-bold text-display-sm text-primary">Risk budget</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-6">
            <Input label="Kelly fraction" type="number" min="0" max="1" step="0.05" value={strategy.fractionalKelly} onChange={(event) => updateStrategy({ fractionalKelly: asNumber(event.target.value, 0.5) })} />
            <Input label="Target exposure %" type="number" min="0" max="100" step="1" value={strategy.targetExposure * 100} onChange={(event) => updateStrategy({ targetExposure: asNumber(event.target.value, 100) / 100 })} />
            <Input label="Position cap %" type="number" min="1" max="100" step="1" value={strategy.maxPosition * 100} onChange={(event) => updateStrategy({ maxPosition: asNumber(event.target.value, 25) / 100 })} />
            <Input label="Tolerance %" type="number" min="0" max="100" step="0.5" value={strategy.rebalanceTolerance * 100} onChange={(event) => updateStrategy({ rebalanceTolerance: asNumber(event.target.value, 2) / 100 })} />
          </div>
          <div className="pt-2 flex items-center justify-between">
            <span className="font-body text-label-sm text-muted">Saved locally</span>
            <Button variant="ghost" size="sm" onClick={resetStrategy}>Reset strategy</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#252525]">
          {[
            { label: 'Stock portfolio value', value: usd.format(result.totalValue), color: 'text-primary' },
            { label: 'Unmodeled positions', value: String(unconfigured), color: unconfigured ? 'text-loss' : 'text-gain' },
            { label: 'Cash reserve', value: pct.format(Math.max(0, 1 - strategy.targetExposure)), color: 'text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-cl p-6">
              <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-3">{stat.label}</p>
              <p className={`font-display font-bold text-display-sm tabular-nums ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {result.warnings.length > 0 && (
        <section className="space-y-px">
          {result.warnings.map((warning) => <div key={warning} className="bg-cl px-5 py-3 border-l-2 border-loss font-body text-label-lg text-on-s">{warning}</div>)}
        </section>
      )}

      <section>
        <div className="mb-6">
          <p className="font-body text-label-sm text-muted uppercase tracking-[0.12em] mb-1">Step 1</p>
          <h2 className="font-display font-bold text-display-sm text-primary">Kelly assumptions</h2>
          <p className="mt-2 max-w-3xl font-body text-label-md text-muted">Set your own probability and payoff range for each holding. The model uses fractional Kelly, then discounts repeated bets through the correlation matrix.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-separate border-spacing-y-px">
            <thead><tr className="font-body text-label-sm text-muted uppercase tracking-[0.08em] text-left">
              <th className="px-4 py-2">Position</th><th className="px-4 py-2">Conviction %</th><th className="px-4 py-2">Bull multiple</th><th className="px-4 py-2">Bear multiple</th><th className="px-4 py-2 text-right">Kelly</th><th className="px-4 py-2 text-right">Target</th><th className="px-4 py-2 text-right">Current</th><th className="px-4 py-2 text-right">Rebalance</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="p-8 bg-cl text-center font-body text-muted">Loading positions…</td></tr> : result.rows.map((row) => {
                const assumption = row.assumption ?? initialAssumption
                const action = !row.assumption ? 'Set assumptions' : Math.abs(row.deltaWeight) <= strategy.rebalanceTolerance ? 'Hold' : row.deltaWeight > 0 ? 'Add' : 'Trim'
                const actionClass = action === 'Add' ? 'text-gain' : action === 'Trim' || action === 'Set assumptions' ? 'text-loss' : 'text-muted'
                return <tr key={row.key} className="bg-cl hover:bg-ch">
                  <td className="px-4 py-3"><div className="font-body font-semibold text-primary">{row.holding.symbol}</div><div className="font-body text-label-sm text-muted truncate max-w-[11rem]">{row.holding.name}</div></td>
                  <td className="px-4 py-3 w-32"><input aria-label={`${row.holding.symbol} conviction`} className="w-full bg-transparent border-b border-blade py-1 text-primary font-body tabular-nums focus:outline-none focus:border-primary" type="number" min="1" max="99" value={Math.round(assumption.conviction * 100)} onChange={(event) => updateAssumption(row.key, { conviction: asNumber(event.target.value, 60) / 100 })} /></td>
                  <td className="px-4 py-3 w-36"><input aria-label={`${row.holding.symbol} bull multiple`} className="w-full bg-transparent border-b border-blade py-1 text-primary font-body tabular-nums focus:outline-none focus:border-primary" type="number" min="0.01" step="0.1" value={assumption.bullMultiple} onChange={(event) => updateAssumption(row.key, { bullMultiple: asNumber(event.target.value, 1) })} /></td>
                  <td className="px-4 py-3 w-36"><input aria-label={`${row.holding.symbol} bear multiple`} className="w-full bg-transparent border-b border-blade py-1 text-primary font-body tabular-nums focus:outline-none focus:border-primary" type="number" min="0.01" step="0.1" value={assumption.bearMultiple} onChange={(event) => updateAssumption(row.key, { bearMultiple: asNumber(event.target.value, 0.5) })} /></td>
                  <td className="px-4 py-3 text-right font-body text-label-md text-on-s tabular-nums">{row.assumption ? pct.format(row.halfKelly) : '—'}</td>
                  <td className="px-4 py-3 text-right font-body font-semibold text-primary tabular-nums">{row.assumption ? pct.format(row.targetWeight) : '—'}</td>
                  <td className="px-4 py-3 text-right font-body text-muted tabular-nums">{pct.format(row.currentWeight)}</td>
                  <td className={`px-4 py-3 text-right font-body font-semibold tabular-nums ${actionClass}`}>{action}{row.assumption && action !== 'Hold' ? ` ${usd.format(Math.abs(row.deltaValue))}` : ''}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      {correlationPairs.length > 0 && (
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 blade-top pt-10">
          <div>
            <p className="font-body text-label-sm text-muted uppercase tracking-[0.12em] mb-1">Step 2</p>
            <h2 className="font-display font-bold text-display-sm text-primary mb-2">Correlation overrides</h2>
            <p className="font-body text-label-md text-muted mb-6">Pairs default to 0. Enter a value from -0.99 to 0.99 when two holdings share a meaningful driver. Values are mirrored automatically.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#252525]">
              {correlationPairs.map(([left, right]) => {
                const leftSymbol = left.split(':')[1]
                const rightSymbol = right.split(':')[1]
                const value = strategy.correlations[left]?.[right] ?? 0
                return <label key={`${left}-${right}`} className="bg-cl px-4 py-3 flex items-center justify-between gap-5 font-body">
                  <span className="text-label-md text-on-s">{leftSymbol} <span className="text-muted">/</span> {rightSymbol}</span>
                  <input aria-label={`${leftSymbol} ${rightSymbol} correlation`} className="w-20 bg-transparent border-b border-blade py-1 text-right text-primary tabular-nums focus:outline-none focus:border-primary" type="number" min="-0.99" max="0.99" step="0.05" value={value} onChange={(event) => updateCorrelation(left, right, Math.max(-0.99, Math.min(0.99, asNumber(event.target.value, 0))))} />
                </label>
              })}
            </div>
          </div>
          <aside className="bg-cl p-6 blade-left">
            <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-3">Calculation chain</p>
            <ol className="space-y-4 font-body text-label-md text-on-s">
              <li><span className="text-gain">01</span> Fractional Kelly from conviction and payoff.</li>
              <li><span className="text-gain">02</span> Inverse correlation adjustment discounts overlap.</li>
              <li><span className="text-gain">03</span> Normalize to the selected exposure.</li>
              <li><span className="text-gain">04</span> Cap and redistribute excess weight.</li>
            </ol>
          </aside>
        </section>
      )}

      <section className="blade-top pt-10">
        <div className="mb-6">
          <p className="font-body text-label-sm text-muted uppercase tracking-[0.12em] mb-1">參數參考</p>
          <h2 className="font-display font-bold text-display-sm text-primary">參數說明</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-[#252525]">
          <div className="bg-cl p-5">
            <p className="font-body font-semibold text-primary text-label-lg mb-2">信念程度</p>
            <p className="font-body text-label-md leading-relaxed text-muted">你估計投資論點成立的機率。它是主觀輸入，不是市場預測；過度樂觀會讓 Kelly 權重過高。</p>
          </div>
          <div className="bg-cl p-5">
            <p className="font-body font-semibold text-primary text-label-lg mb-2">上漲／下跌倍數</p>
            <p className="font-body text-label-md leading-relaxed text-muted">上漲倍數是看對時的預期獲利；下跌倍數是看錯時的絕對損失。上漲 1.5、下跌 0.5 代表預期 +150% 與 -50%。</p>
          </div>
          <div className="bg-cl p-5">
            <p className="font-body font-semibold text-primary text-label-lg mb-2">Kelly 折扣係數</p>
            <p className="font-body text-label-md leading-relaxed text-muted">乘在完整 Kelly 結果上的係數。0.5 是 half-Kelly，為估計誤差保留緩衝；數值越低，潛在報酬越保守但安全邊際越大。</p>
          </div>
          <div className="bg-cl p-5">
            <p className="font-body font-semibold text-primary text-label-lg mb-2">目標曝險</p>
            <p className="font-body text-label-md leading-relaxed text-muted">分配給模型持倉的總資產比例；其餘部分視為未配置的現金緩衝。</p>
          </div>
          <div className="bg-cl p-5">
            <p className="font-body font-semibold text-primary text-label-lg mb-2">相關性</p>
            <p className="font-body text-label-md leading-relaxed text-muted">範圍從 -1 到 1。高度正相關代表兩個持倉傾向同漲同跌，逆矩陣步驟會降低其合計曝險，避免重複下注。</p>
          </div>
          <div className="bg-cl p-5">
            <p className="font-body font-semibold text-primary text-label-lg mb-2">持倉上限／容忍值</p>
            <p className="font-body text-label-md leading-relaxed text-muted">持倉上限是每個標的的硬性最大比例，超出的部分會重新分配。容忍值則決定目前權重與目標權重相差多少時，表格才提出加碼或減碼。</p>
          </div>
        </div>
      </section>
    </div>
  )
}
