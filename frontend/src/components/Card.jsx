import React from 'react'

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-[rgba(244,225,193,0.65)] border border-[rgba(0,128,128,0.2)] rounded-xl p-6 shadow-[0_2px_16px_rgba(0,80,80,0.08)] ${className}`}>
      {children}
    </div>
  )
}
