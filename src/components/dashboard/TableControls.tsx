// Kinetic Ledger: table controls — bottom-line inputs, no box borders

import { useAppStore } from '../../store/useAppStore'

export function TableControls() {
  const { tableFilters, setFilter } = useAppStore((s) => ({
    tableFilters: s.tableFilters,
    setFilter: s.setFilter,
  }))

  const selectCls = `
    bg-transparent text-on-s font-body text-label-md uppercase tracking-[0.04em]
    border-0 border-b border-b-blade pb-1.5
    focus:outline-none focus:border-b-2 focus:border-b-primary
    cursor-pointer
  `

  return (
    <div className="flex flex-wrap items-end gap-6 mb-4">
      {/* Search */}
      <div className="flex-1 min-w-48">
        <label className="block font-body text-label-sm text-muted uppercase tracking-[0.08em] mb-1">
          Search
        </label>
        <input
          type="text"
          placeholder="symbol or name…"
          value={tableFilters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          className="w-full bg-transparent text-primary font-body text-label-lg border-0 border-b border-b-blade pb-1.5 placeholder:text-[#353535] focus:outline-none focus:border-b-2 focus:border-b-primary"
          style={{ transition: 'none' }}
        />
      </div>

      {/* Type */}
      <div>
        <label className="block font-body text-label-sm text-muted uppercase tracking-[0.08em] mb-1">
          Type
        </label>
        <select
          value={tableFilters.type}
          onChange={(e) => setFilter({ type: e.target.value as typeof tableFilters.type })}
          className={selectCls}
        >
          <option value="all">All</option>
          <option value="stock">Stocks</option>
          <option value="crypto">Crypto</option>
        </select>
      </div>

      {/* Platform */}
      <div>
        <label className="block font-body text-label-sm text-muted uppercase tracking-[0.08em] mb-1">
          Platform
        </label>
        <select
          value={tableFilters.platform}
          onChange={(e) => setFilter({ platform: e.target.value as typeof tableFilters.platform })}
          className={selectCls}
        >
          <option value="all">All</option>
          <option value="schwab">Schwab</option>
          <option value="okx">OKX</option>
          <option value="zerion">Zerion</option>
          <option value="futu">Futu</option>
        </select>
      </div>
    </div>
  )
}
