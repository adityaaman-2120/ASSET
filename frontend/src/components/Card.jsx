import React from 'react'

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl ${className}`}>
      {children}
    </div>
  )
}
