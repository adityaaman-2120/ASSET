import React from 'react'

export default function Badge({ children, variant = 'info' }) {
  const styles = {
    info: 'bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-[#7C3AED]/10 text-purple-300 border-[#7C3AED]/20',
    gray: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[variant] || styles.info}`}>
      {children}
    </span>
  )
}
