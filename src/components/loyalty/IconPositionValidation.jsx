import React, { useState, useMemo, useCallback } from 'react';
import { FiRefreshCw, FiCheck } from 'react-icons/fi';
import { LOYALTY_ICONS, shuffleArray, getIconById } from '../../constants/loyaltyIcons';

const POSITION_LABELS = {
  'top-left': 'top left',
  'top-right': 'top right',
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right'
};

const POSITION_INDICES = {
  'top-left': 0,
  'top-right': 3,
  'bottom-left': 12,
  'bottom-right': 15
};

export default function IconPositionValidation({ config, onSuccess, onFailure, attemptsRemaining }) {
  const [shuffleCount, setShuffleCount] = useState(0);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const targetIconId = config?.targetIcon || 'heart';
  const targetPosition = config?.targetPosition || 'top-right';
  const targetIcon = getIconById(targetIconId);
  const targetIndex = POSITION_INDICES[targetPosition];

  const gridIcons = useMemo(() => {
    let icons = shuffleArray([...LOYALTY_ICONS]).slice(0, 16);
    const targetIconObj = getIconById(targetIconId);
    if (targetIconObj) {
      icons = icons.filter(i => i.id !== targetIconId);
      icons = shuffleArray(icons).slice(0, 15);
      const insertIndex = Math.floor(Math.random() * 16);
      icons.splice(insertIndex, 0, targetIconObj);
    }
    return icons;
  }, [targetIconId, shuffleCount]);

  const isTargetInPosition = gridIcons[targetIndex]?.id === targetIconId;

  const handleShuffle = useCallback(() => {
    setShuffleCount(prev => prev + 1);
    setError('');
    setIsConfirmed(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (isTargetInPosition) {
      setIsConfirmed(true);
      setTimeout(() => onSuccess(), 300);
    } else {
      setIsShaking(true);
      setError(`The ${targetIcon?.name} is not in the ${POSITION_LABELS[targetPosition]}`);
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
      onFailure();
    }
  }, [isTargetInPosition, targetIcon, targetPosition, onSuccess, onFailure]);

  const getPositionHighlight = (index) => {
    if (index === targetIndex) {
      if (isConfirmed && isTargetInPosition) return 'ring-2 ring-green-500 bg-green-500/20';
      if (isShaking && !isTargetInPosition) return 'ring-2 ring-red-500 bg-red-500/20';
      return 'ring-2 ring-teal-500/50 bg-teal-500/10';
    }
    return '';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        <p className="text-gray-400 text-sm mb-2">
          Click <span className="text-teal-400 font-medium">Confirm</span> when the
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
          {targetIcon && (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${targetIcon.color}20` }}
            >
              <targetIcon.icon size={22} style={{ color: targetIcon.color }} />
            </div>
          )}
          <span className="text-white font-medium">{targetIcon?.name}</span>
        </div>
        <p className="text-gray-400 text-sm">
          is in the <span className="text-white font-medium">{POSITION_LABELS[targetPosition]}</span> corner
        </p>
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          {attemptsRemaining} attempts remaining
        </p>
      </div>

      <div
        className={`grid grid-cols-4 gap-2 mb-4 ${isShaking ? 'animate-shake' : ''}`}
      >
        {gridIcons.map((icon, index) => {
          const IconComponent = icon.icon;
          const positionHighlight = getPositionHighlight(index);

          return (
            <div
              key={`${shuffleCount}-${index}`}
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-150
                bg-white/10 ${positionHighlight}
              `}
            >
              <IconComponent size={28} className="text-gray-300" />
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleShuffle}
          className="px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-2 transition-colors"
        >
          <FiRefreshCw size={18} />
          Shuffle
        </button>
        <button
          onClick={handleConfirm}
          disabled={isConfirmed}
          className="px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2 transition-colors"
        >
          <FiCheck size={18} />
          Confirm
        </button>
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
