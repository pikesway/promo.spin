import React, { useState, useRef, useEffect } from 'react';
import { FiInfo, FiX } from 'react-icons/fi';

export default function InfoButton({ title, content, size = 14, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const keyHandler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={title ? `Help: ${title}` : 'More information'}
        className="flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 hover:opacity-80"
        style={{ color: 'var(--text-tertiary)', width: size + 8, height: size + 8 }}
      >
        <FiInfo size={size} />
      </button>

      {open && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 rounded-xl shadow-xl p-4 text-sm"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            {title && (
              <span className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                {title}
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <FiX size={14} />
            </button>
          </div>
          <div className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {typeof content === 'string'
              ? <p>{content}</p>
              : content}
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-3 h-3 rotate-45 -mt-1.5"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
          />
        </div>
      )}
    </span>
  );
}
