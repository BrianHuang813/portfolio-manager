// Kinetic Ledger: minimal platform status — just dot + name, no borders

import { useAppStore } from '../../store/useAppStore'
import type { Platform } from '../../types/holdings'

const LABELS: Record<Platform, string> = {
  schwab: 'SCHW',
  okx: 'OKX',
  zerion: 'ZRN',
  futu: 'FUTU',
}

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  const state = useAppStore((s) => s.platformStatus[platform])

  const dot =
    state.status === 'success' ? 'bg-gain' :
    state.status === 'error'   ? 'bg-loss' :
    state.status === 'loading' ? 'bg-[#4bdfa4] animate-pulse' :
    'bg-muted'

  const label =
    state.status === 'error'   ? 'text-loss' :
    state.status === 'success' ? 'text-muted' :
    'text-[#555]'

  return (
    <div
      className={`flex items-center gap-1.5 font-body text-label-sm ${label}`}
      title={state.errorMessage ?? undefined}
    >
      <span className={`w-1.5 h-1.5 ${dot}`} />
      <span className="uppercase tracking-[0.08em]">
        {LABELS[platform]}
        {state.status === 'success' && state.lastUpdated && (
          <span className="text-[#404040] ml-1">{ago(state.lastUpdated)}</span>
        )}
      </span>
    </div>
  )
}
