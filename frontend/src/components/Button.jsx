import React from 'react'

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyle = 'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none'
  
  const styles = {
    primary: 'bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0E1A] shadow-lg shadow-cyan-500/20',
    secondary: 'bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white shadow-lg shadow-purple-500/20',
    ghost: 'border border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
  }
  
  return (
    <button
      type="button"
      className={`${baseStyle} ${styles[variant] || styles.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
