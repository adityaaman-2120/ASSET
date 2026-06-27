import { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const sizes = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
}

export function Container({ children, className = '', size = 'xl' }: ContainerProps) {
  return (
    <div className={`${sizes[size]} mx-auto px-6 md:px-10 ${className}`}>
      {children}
    </div>
  )
}
