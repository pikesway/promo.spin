import React from 'react';

const GlassCard = ({ children, className = '', onClick, hoverEffect = false }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        glass-panel rounded-2xl p-6 relative overflow-hidden
        ${hoverEffect ? 'glass-card-hover cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Subtle Noise Texture overlay could go here */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Decorative gradient blob for depth */}
      {hoverEffect && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
      )}
    </div>
  );
};

export default GlassCard;