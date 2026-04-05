// Kinetic Ledger: Input — no background, bottom-line only. Focus = 2px white.

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const uid = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={uid}
          className="font-body text-label-sm text-muted uppercase tracking-[0.08em]"
        >
          {label}
        </label>
      )}
      <input
        id={uid}
        className={`
          w-full bg-transparent text-primary font-body text-label-lg
          border-0 border-b border-b-blade pb-2 pt-1
          placeholder:text-[#3a3a3a]
          focus:outline-none focus:border-b-2 focus:border-b-primary
          transition-none
          ${className}
        `}
        {...props}
      />
    </div>
  )
}

interface TextAreaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function TextAreaInput({ label, className = '', id, ...props }: TextAreaInputProps) {
  const uid = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={uid}
          className="font-body text-label-sm text-muted uppercase tracking-[0.08em]"
        >
          {label}
        </label>
      )}
      <textarea
        id={uid}
        className={`
          w-full bg-transparent text-primary font-body text-label-lg
          border-0 border-b border-b-blade pb-2 pt-1
          placeholder:text-[#3a3a3a] resize-none
          focus:outline-none focus:border-b-2 focus:border-b-primary
          transition-none
          ${className}
        `}
        {...props}
      />
    </div>
  )
}
