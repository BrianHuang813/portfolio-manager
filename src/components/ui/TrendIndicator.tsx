// Kinetic Ledger: Naked data trend — no badge, color + arrow only

interface TrendIndicatorProps {
  value: number           // raw delta (USD or %)
  percent?: number        // optional %, shown alongside
  format?: 'usd' | 'pct' | 'both'
  size?: 'sm' | 'md' | 'lg'
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const PCT = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

export function TrendIndicator({
  value,
  percent,
  format = 'both',
  size = 'md',
}: TrendIndicatorProps) {
  const up = value >= 0
  const color = value === 0 ? 'text-muted' : up ? 'text-gain' : 'text-loss'

  const textSize = {
    sm: 'text-label-sm',
    md: 'text-label-lg',
    lg: 'text-[1rem] font-semibold',
  }[size]

  const arrow = value === 0 ? '—' : up ? '↑' : '↓'

  return (
    <span className={`inline-flex items-center gap-1 font-body tabular-nums ${color} ${textSize}`}>
      <span className="text-[0.65em] leading-none">{arrow}</span>
      {format === 'usd' && <span>{USD.format(Math.abs(value))}</span>}
      {format === 'pct' && percent !== undefined && <span>{PCT(percent)}</span>}
      {format === 'both' && (
        <>
          <span>{USD.format(Math.abs(value))}</span>
          {percent !== undefined && (
            <span className="opacity-60 text-[0.9em]">({PCT(percent)})</span>
          )}
        </>
      )}
    </span>
  )
}
