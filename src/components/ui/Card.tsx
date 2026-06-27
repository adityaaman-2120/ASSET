import { ReactNode } from 'react'

type CardVariant = 'glass' | 'clay' | 'clay-gold' | 'neumorphic' | 'border'

interface CardProps {
  children: ReactNode
  variant?: CardVariant
  className?: string
  glow?: 'magenta' | 'gold' | 'none'
  hover?: boolean
}

const variants: Record<CardVariant, string> = {
  glass: 'glass rounded-2xl',
  clay: 'clay',
  'clay-gold': 'clay-gold',
  neumorphic: 'neumorphic',
  border: 'border border-white/8 bg-[rgba(255,255,255,0.02)] rounded-2xl',
}

const glows = {
  magenta: 'hover:glow-magenta hover:border-[rgba(228,113,232,0.3)]',
  gold: 'hover:glow-gold hover:border-[rgba(172,133,99,0.35)]',
  none: '',
}

export function Card({
  children,
  variant = 'glass',
  className = '',
  glow = 'none',
  hover = false,
}: CardProps) {
  const hoverClass = hover ? `transition-all duration-300 ${glows[glow]}` : ''
  return (
    <div className={`${variants[variant]} ${hoverClass} ${className}`}>
      {children}
    </div>
  )
}
