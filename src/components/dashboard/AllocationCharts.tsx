// Kinetic Ledger: allocation pie — dark, no stroke, gain/loss palette

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { HoldingRecord } from '../../types/holdings'

// Kinetic palette — stark, no pastels
const PALETTE = [
  '#4bdfa4', '#ea6767', '#FFFFFF', '#919191',
  '#2d8c68', '#9e3f3f', '#c8c8c8', '#555555',
  '#7fffd4', '#ff9999',
]

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
})

interface Props { holdings: HoldingRecord[] }

// Custom label outside the slice
const RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, outerRadius, name, percent }: {
  cx: number; cy: number; midAngle: number; outerRadius: number; name: string; percent: number
}) {
  if (percent < 0.06) return null
  const r = outerRadius + 20
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x} y={y}
      fill="#919191"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: 10, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {name} {(percent * 100).toFixed(0)}%
    </text>
  )
}

export function AllocationCharts({ holdings }: Props) {
  const typeData = useMemo(() => {
    const t: Record<string, number> = {}
    holdings.forEach((h) => { t[h.type] = (t[h.type] ?? 0) + h.marketValue })
    return Object.entries(t).map(([name, value]) => ({ name, value }))
  }, [holdings])

  const symbolData = useMemo(() => {
    const t: Record<string, number> = {}
    holdings.forEach((h) => { t[h.symbol] = (t[h.symbol] ?? 0) + h.marketValue })
    const sorted = Object.entries(t).sort(([, a], [, b]) => b - a)
    const top = sorted.slice(0, 9).map(([name, value]) => ({ name, value }))
    const rest = sorted.slice(9).reduce((s, [, v]) => s + v, 0)
    if (rest > 0) top.push({ name: 'Other', value: rest })
    return top
  }, [holdings])

  if (holdings.length === 0) return null

  const tooltipStyle = {
    background: '#1b1b1b',
    border: 'none',
    borderLeft: '2px solid #4bdfa4',
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#e2e2e2',
    padding: '8px 12px',
  }

  return (
    <div className="space-y-6">
      {/* ── Chart A: type split ── */}
      <div>
        <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-4">
          Asset Type
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={typeData}
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={70}
              dataKey="value"
              strokeWidth={0}
              label={(p) => <CustomLabel {...p} />}
              labelLine={false}
            >
              {typeData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]!} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [USD.format(v), '']}
              contentStyle={tooltipStyle}
              itemStyle={{ color: '#4bdfa4' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Chart B: top symbols ── */}
      <div>
        <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-4">
          Top Holdings
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={symbolData}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={75}
              dataKey="value"
              strokeWidth={0}
              label={(p) => <CustomLabel {...p} />}
              labelLine={false}
            >
              {symbolData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]!} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [USD.format(v), '']}
              contentStyle={tooltipStyle}
              itemStyle={{ color: '#4bdfa4' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
