// Kinetic Ledger: performance line — gain color if positive net, loss if negative

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { loadSnapshots } from '../../utils/snapshot'

const fmtCompact = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0,
})
const fmtFull = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})

export function PerformanceChart() {
  const { data, lineColor } = useMemo(() => {
    const snaps = loadSnapshots()
    const data = snaps.map((s) => ({
      date: s.date.slice(5), // MM-DD
      value: s.totalValue,
    }))
    const first = data[0]?.value ?? 0
    const last  = data.at(-1)?.value ?? 0
    const lineColor = last >= first ? '#4bdfa4' : '#ea6767'
    return { data, lineColor }
  }, [])

  if (data.length < 2) {
    return (
      <div className="py-6">
        <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-8">
          Performance
        </p>
        <p className="font-body text-label-md text-muted italic">
          No history yet — data appears after second refresh.
        </p>
      </div>
    )
  }

  const vals = data.map((d) => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = (max - min) * 0.15 || 500

  return (
    <div className="py-2">
      <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-6">
        Performance
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.12} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#555', fontSize: 10, fontFamily: 'Inter' }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tickFormatter={(v: number) => fmtCompact.format(v)}
            tick={{ fill: '#555', fontSize: 10, fontFamily: 'Inter' }}
            axisLine={false} tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(v: number) => [fmtFull.format(v), 'Portfolio']}
            contentStyle={{
              background: '#1b1b1b',
              border: 'none',
              borderLeft: `2px solid ${lineColor}`,
              fontFamily: 'Inter',
              fontSize: 11,
              color: '#e2e2e2',
              padding: '6px 12px',
            }}
            labelStyle={{ color: '#555', fontSize: 10 }}
            itemStyle={{ color: lineColor }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill="url(#perf-fill)"
            dot={false}
            activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
