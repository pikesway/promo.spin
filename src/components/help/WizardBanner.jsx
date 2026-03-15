import React from 'react';
import { FiInfo } from 'react-icons/fi';

export default function WizardBanner({ children }) {
  if (!children) return null;
  return (
    <div
      className="flex gap-3 rounded-xl px-4 py-3 mb-4 text-sm leading-relaxed"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
      }}
    >
      <FiInfo size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
      <span>{children}</span>
    </div>
  );
}
