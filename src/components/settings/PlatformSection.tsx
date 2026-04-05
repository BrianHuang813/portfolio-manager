// Kinetic Ledger: collapsible platform section
// Visual depth: closed = cl bg, open body = cll bg. No border wrapping — only left blade.

import { useState } from 'react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface Field {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'password'
}

interface PlatformSectionProps {
  title: string
  tag: string        // short uppercase tag e.g. "SCHW"
  fields: Field[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onSave: () => void
  saved: boolean
}

export function PlatformSection({
  title, tag, fields, values, onChange, onSave, saved,
}: PlatformSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`blade-left ${saved ? 'border-l-gain' : 'border-l-muted'}`}
      style={{ borderLeftWidth: saved ? '2px' : '1px' }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-cl hover:bg-ch text-left"
        style={{ transition: 'none' }}
      >
        <div className="flex items-center gap-4">
          <span className="font-body text-label-sm text-muted uppercase tracking-[0.1em]">
            {tag}
          </span>
          <span className="font-display font-semibold text-primary">{title}</span>
          {saved && (
            <span className="font-body text-label-sm text-gain uppercase tracking-[0.08em]">
              ● Active
            </span>
          )}
        </div>
        <span className={`text-muted text-xs font-mono transition-none ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="bg-cll px-5 py-6 space-y-6">
          {fields.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              id={`${tag}-${field.key}`}
              type={field.type ?? 'text'}
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ))}
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={onSave}>
              Save {title}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
