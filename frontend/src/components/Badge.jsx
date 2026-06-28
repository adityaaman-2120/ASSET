import React from 'react'

export default function Badge({ children, variant = 'info' }) {
  const styles = {
    info: 'bg-[rgba(0,128,128,0.15)] text-[#008080] border-[rgba(0,128,128,0.3)] font-bold',
    success: 'bg-emerald-500/15 text-emerald-700 border-emerald-600/30 font-bold',
    danger: 'bg-red-500/15 text-red-700 border-red-600/30 font-bold',
    warning: 'bg-amber-500/15 text-[#78350f] border-amber-600/30 font-bold',
    purple: 'bg-[rgba(154,110,58,0.15)] text-[#78350f] border-[rgba(154,110,58,0.3)] font-bold',
    gray: 'bg-[rgba(13,43,43,0.12)] text-[#0d2b2b] border-[rgba(13,43,43,0.3)] font-bold',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[variant] || styles.info}`}>
      {children}
    </span>
  )
}
