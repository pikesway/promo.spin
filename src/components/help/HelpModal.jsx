import React, { useEffect } from 'react';
import { FiX, FiInfo } from 'react-icons/fi';

export default function HelpModal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', maxHeight: '85vh' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <FiInfo size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <FiX size={16} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto text-sm leading-relaxed space-y-4" style={{ color: 'var(--text-secondary)', maxHeight: 'calc(85vh - 64px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function HelpSection({ heading, children }) {
  return (
    <div>
      {heading && (
        <p className="font-semibold mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>{heading}</p>
      )}
      <div className="space-y-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  );
}
