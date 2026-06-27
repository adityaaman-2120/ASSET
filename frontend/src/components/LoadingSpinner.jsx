import React from 'react'

export default function LoadingSpinner({ size = 'md', message = 'Loading...' }) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <div
        className={`animate-spin rounded-full border-t-[#00D4FF] border-r-transparent border-b-[#00D4FF] border-l-transparent ${sizeClasses[size]}`}
      />
      {message && (
        <p className="text-sm font-medium text-slate-400 animate-pulse">{message}</p>
      )}
    </div>
  )
}
