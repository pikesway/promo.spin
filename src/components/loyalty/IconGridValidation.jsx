import React, { useState, useMemo } from 'react';
import { LOYALTY_ICONS, shuffleArray, getIconById } from '../../constants/loyaltyIcons';

export default function IconGridValidation({ config, onSuccess, onFailure, attemptsRemaining }) {
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const targetIconId = config?.targetIcon || 'heart';
  const targetIcon = getIconById(targetIconId);

  const gridIcons = useMemo(() => {
    const icons = shuffleArray([...LOYALTY_ICONS]).slice(0, 16);
    if (!icons.find(i => i.id === targetIconId)) {
      const randomIndex = Math.floor(Math.random() * 16);
      icons[randomIndex] = targetIcon;
    }
    return shuffleArray(icons);
  }, [targetIconId, targetIcon]);

  const handleIconClick = (icon) => {
    setSelectedIcon(icon.id);
    setError('');

    if (icon.id === targetIconId) {
      setTimeout(() => onSuccess(), 200);
    } else {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setSelectedIcon(null);
      }, 500);
      setError('Incorrect selection');
      onFailure();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 text-center">
        <p className="text-gray-400 text-sm mb-3">
          Select the <span className="text-white font-medium">{targetIcon?.name}</span> icon
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
          {targetIcon && (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${targetIcon.color}20` }}
            >
              <targetIcon.icon size={28} style={{ color: targetIcon.color }} />
            </div>
          )}
        </div>
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          {attemptsRemaining} attempts remaining
        </p>
      </div>

      <div
        className={`grid grid-cols-4 gap-2 ${isShaking ? 'animate-shake' : ''}`}
      >
        {gridIcons.map((icon, index) => {
          const IconComponent = icon.icon;
          const isSelected = selectedIcon === icon.id;

          return (
            <button
              key={index}
              onClick={() => handleIconClick(icon)}
              disabled={selectedIcon !== null}
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-150
                ${isSelected
                  ? icon.id === targetIconId
                    ? 'bg-green-500/30 ring-2 ring-green-500 scale-95'
                    : 'bg-red-500/30 ring-2 ring-red-500 scale-95'
                  : 'bg-white/10 hover:bg-white/20 active:scale-95'
                }
                disabled:cursor-not-allowed
              `}
            >
              <IconComponent
                size={28}
                className={isSelected ? 'text-white' : 'text-gray-300'}
              />
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
