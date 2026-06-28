import React from 'react'
import Button from './Button'

export default function Modal({ isOpen, onClose, title, children, onConfirm, confirmText = 'Confirm' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(13,43,43,0.4)] backdrop-blur-sm">
      <div className="bg-[#F4E1C1] border border-[rgba(0,128,128,0.2)] rounded-xl max-w-md w-full overflow-hidden shadow-[0_20px_60px_rgba(0,80,80,0.2)] animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-[rgba(0,128,128,0.15)] flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#0d2b2b]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[rgba(13,43,43,0.5)] hover:text-[#0d2b2b] text-xl font-bold cursor-pointer focus:outline-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 text-sm text-[rgba(13,43,43,0.75)]">
          {children}
        </div>
        <div className="p-6 bg-[rgba(0,128,128,0.04)] border-t border-[rgba(0,128,128,0.1)] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {onConfirm && (
            <Button variant="primary" onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
