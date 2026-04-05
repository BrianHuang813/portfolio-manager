// Kinetic Ledger: news drawer — glassmorphism overlay (cll + backdrop-blur)
// Left blade = gain/loss color based on selected symbol type. No border wrapping.

import { useAppStore } from '../../store/useAppStore'
import { useNews } from '../../hooks/useNews'

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function SkeletonArticle() {
  return (
    <div className="py-5 blade-top space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
      <div className="skeleton h-2 w-24 mt-2" />
    </div>
  )
}

export function NewsPanel() {
  const { selectedSymbol, selectedSymbolType, setSelectedSymbol } = useAppStore((s) => ({
    selectedSymbol:     s.selectedSymbol,
    selectedSymbolType: s.selectedSymbolType,
    setSelectedSymbol:  s.setSelectedSymbol,
  }))

  const { data: articles, isLoading, isError } = useNews(selectedSymbol, selectedSymbolType)

  if (!selectedSymbol) return null

  const bladeColor = selectedSymbolType === 'crypto' ? '#4bdfa4' : '#FFFFFF'

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-30"
        style={{ backdropFilter: 'blur(2px)' }}
        onClick={() => setSelectedSymbol(null, null)}
      />

      {/* Drawer — glassmorphism: cll + 15px blur */}
      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-40 flex flex-col"
        style={{
          background: 'rgba(14,14,14,0.92)',
          backdropFilter: 'blur(15px)',
          borderLeft: `2px solid ${bladeColor}`,
        }}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="font-body text-label-sm text-muted uppercase tracking-[0.1em] mb-1">
                {selectedSymbolType === 'crypto' ? 'Crypto · General Market' : 'Company'} News
              </p>
              <h2 className="font-display font-bold text-display-sm text-primary leading-none">
                {selectedSymbol}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSymbol(null, null)}
              className="font-body text-label-sm text-muted hover:text-primary px-2 py-1 bg-ch mt-1"
              style={{ transition: 'none' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Articles */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {isLoading && (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonArticle key={i} />)}
            </div>
          )}

          {isError && (
            <p className="font-body text-label-md text-loss italic">
              Failed to load news. Check your Finnhub API key.
            </p>
          )}

          {!isLoading && !isError && (!articles || articles.length === 0) && (
            <p className="font-body text-label-md text-muted italic mt-4">
              No recent news found.
            </p>
          )}

          {articles?.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-5 group"
              style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
            >
              <p className="font-body text-label-lg text-on-s group-hover:text-primary leading-snug mb-2" style={{ transition: 'none' }}>
                {a.headline}
              </p>
              <div className="flex items-center gap-3 font-body text-label-sm text-muted">
                <span className="uppercase tracking-[0.06em]">{a.source}</span>
                <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
                <span>{fmtDate(a.datetime)}</span>
              </div>
            </a>
          ))}
        </div>
      </aside>
    </>
  )
}
