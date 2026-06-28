import React from 'react'

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyle = 'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none'

  const styles = {
    primary: 'text-[#F4E1C1] shadow-[0_0_16px_rgba(0,128,128,0.2)]',
    secondary: 'text-[#F4E1C1]',
    ghost: 'border border-[rgba(0,128,128,0.3)] text-[#0d2b2b] hover:bg-[rgba(0,128,128,0.06)] hover:text-[#008080]',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
  }

  const inlineStyles = {
    primary: { background: '#008080' },
    secondary: { background: '#9a6e3a' },
    ghost: {},
    danger: {},
  }

  return (
    <button
      type="button"
      className={`${baseStyle} ${styles[variant] || styles.primary} ${className}`}
      style={inlineStyles[variant] || inlineStyles.primary}
      {...props}
    >
      {children}
    </button>
  )
}
