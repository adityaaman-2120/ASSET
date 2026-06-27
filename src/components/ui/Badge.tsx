import { ReactNode } from 'react'

type BadgeVariant = 'teal' | 'sand' | 'green' | 'red' | 'neutral' | 'ink'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  teal:    'bg-[rgba(0,128,128,0.1)] text-[#008080] border-[rgba(0,128,128,0.25)]',
  sand:    'bg-[rgba(196,154,96,0.1)] text-[#9a6e3a] border-[rgba(196,154,96,0.3)]',
  green:   'bg-[rgba(16,185,129,0.1)] text-emerald-700 border-[rgba(16,185,129,0.25)]',
  red:     'bg-[rgba(220,38,38,0.08)] text-red-600 border-[rgba(220,38,38,0.2)]',
  neutral: 'bg-[rgba(13,43,43,0.06)] text-[#0d2b2b]/50 border-[rgba(13,43,43,0.1)]',
  ink:     'bg-[#0d2b2b] text-[#F4E1C1] border-[#0d2b2b]',
}

export function Badge({ children, variant = 'teal', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase border font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
