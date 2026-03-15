import React from 'react';

export default function FieldHint({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
      {children}
    </p>
  );
}
