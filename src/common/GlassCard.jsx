import React from 'react';

const GlassCard = ({ children, className = '', onClick, hoverEffect = false, style = {}, ...props }) => {
  return (
    <div
      onClick={onClick}
      className={`
        glass-panel rounded-2xl p-6 relative overflow-hidden
        ${hoverEffect ? 'glass-card-hover cursor-pointer' : ''}
        ${className}
      `}
      style={style}
      {...props}
    >
      <div className="relative z-10">
        {children}
      </div>

      {hoverEffect && (
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
          style={{ background: 'var(--brand-primary)', opacity: 0.1 }}
        />
      )}
    </div>
  );
};

export default GlassCard;