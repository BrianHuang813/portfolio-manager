// Kinetic Ledger: Settings page — editorial header, asymmetric layout

import { SettingsForm } from '../components/settings/SettingsForm'

export function Settings() {
  return (
    <div className="max-w-2xl">
      {/* Editorial header — massive contrast */}
      <div className="mb-12">
        <p className="font-body text-label-sm text-muted uppercase tracking-[0.12em] mb-3">
          Configuration
        </p>
        <h1 className="font-display text-display-md text-primary leading-none">
          API<br />
          <span className="text-muted">Credentials</span>
        </h1>
      </div>

      <SettingsForm />
    </div>
  )
}
