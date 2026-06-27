import { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'sand' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  className?: string
  onClick?: () => void
  href?: string
  icon?: ReactNode
  iconRight?: ReactNode
  disabled?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-[#008080] text-[#F4E1C1] font-semibold hover:bg-[#006666] shadow-[0_0_20px_rgba(0,128,128,0.3)] hover:shadow-[0_0_32px_rgba(0,128,128,0.5)] active:scale-[0.98]',
  secondary:
    'bg-[rgba(0,128,128,0.1)] text-[#008080] border border-[rgba(0,128,128,0.3)] hover:bg-[rgba(0,128,128,0.18)] hover:border-[rgba(0,128,128,0.5)]',
  ghost:
    'text-[#0d2b2b]/60 hover:text-[#0d2b2b] hover:bg-[rgba(0,128,128,0.06)]',
  sand:
    'bg-[#0d2b2b] text-[#F4E1C1] font-semibold hover:bg-[#004d4d] shadow-[0_4px_20px_rgba(13,43,43,0.25)] active:scale-[0.98]',
  outline:
    'border border-[rgba(0,128,128,0.25)] text-[#0d2b2b]/70 hover:border-[rgba(0,128,128,0.5)] hover:bg-[rgba(0,128,128,0.06)]',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-sm rounded-xl',
  lg: 'px-8 py-3.5 text-sm rounded-2xl',
}

export function Button({ children, variant = 'primary', size = 'md', className = '', onClick, href, icon, iconRight, disabled = false }: ButtonProps) {
  const base = 'inline-flex items-center gap-2 font-medium transition-all duration-200 cursor-pointer select-none'
  const classes = [base, variants[variant], sizes[size], className].join(' ')

  if (href) return (
    <a href={href} className={classes}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </a>
  )

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  )
}
