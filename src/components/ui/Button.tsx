// Kinetic Ledger: Primary & Secondary Button — 0px corners, no transition on hover

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center gap-2 font-body font-medium tracking-wide cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none'

  const sizes = {
    sm: 'px-4 py-1.5 text-label-sm',
    md: 'px-5 py-2.5 text-label-lg',
  }

  const variants = {
    // Primary: white bg, near-black text. Hover: snap to #d4d4d4 (no transition per spec)
    primary: `
      bg-primary text-[#131313]
      hover:bg-[#d4d4d4]
      active:bg-[#b8b8b8]
    `,
    // Secondary: dark surface + left structural blade
    secondary: `
      bg-chh text-primary
      border-l-2 border-l-primary
      hover:bg-ch
      active:bg-cl
    `,
    // Ghost: muted text, no bg, top blade on hover
    ghost: `
      bg-transparent text-muted
      hover:text-primary hover:bg-cl
      active:bg-ch
    `,
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ transition: 'none' }}   // spec: hover is instantaneous
      {...props}
    >
      {children}
    </button>
  )
}
