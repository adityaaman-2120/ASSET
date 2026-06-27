import React from 'react'
import Button from './Button'

export default function Modal({ isOpen, onClose, title, children, onConfirm, confirmText = 'Confirm' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer focus:outline-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 text-sm text-slate-300">
          {children}
        </div>
        <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
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
