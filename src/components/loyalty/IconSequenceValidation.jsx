import React, { useState, useMemo } from 'react';
import { FiX } from 'react-icons/fi';
import { LOYALTY_ICONS, shuffleArray, getIconById } from '../../constants/loyaltyIcons';

export default function IconSequenceValidation({ config, onSuccess, onFailure, attemptsRemaining }) {
  const [selectedSequence, setSelectedSequence] = useState([]);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const targetSequence = config?.iconSequence || ['heart', 'star'];
  const sequenceLength = targetSequence.length;

  const targetIcons = targetSequence.map(id => getIconById(id)).filter(Boolean);

  const gridIcons = useMemo(() => {
    let icons = shuffleArray([...LOYALTY_ICONS]).slice(0, 16);
    targetSequence.forEach((targetId) => {
      if (!icons.find(i => i.id === targetId)) {
        const targetIcon = getIconById(targetId);
        if (targetIcon) {
          const randomIndex = Math.floor(Math.random() * icons.length);
          icons[randomIndex] = targetIcon;
        }
      }
    });
    return shuffleArray(icons);
  }, [targetSequence]);

  const handleIconClick = (icon) => {
    if (selectedSequence.length >= sequenceLength) return;

    const newSequence = [...selectedSequence, icon.id];
    setSelectedSequence(newSequence);
    setError('');

    if (newSequence.length === sequenceLength) {
      const isCorrect = newSequence.every((id, index) => id === targetSequence[index]);

      if (isCorrect) {
        setTimeout(() => onSuccess(), 300);
      } else {
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setSelectedSequence([]);
        }, 500);
        setError('Incorrect sequence');
        onFailure();
      }
    }
  };

  const handleClear = () => {
    setSelectedSequence([]);
    setError('');
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        <p className="text-gray-400 text-sm mb-2">
          Staff: Enter your validation code
        </p>
        <p className="text-gray-500 text-xs">
          Select {sequenceLength} icon{sequenceLength > 1 ? 's' : ''} to verify
        </p>
      </div>

      <div className="mb-4">
        <p className="text-gray-500 text-xs text-center mb-2">Your selection:</p>
        <div className="flex items-center gap-2 min-h-[48px] px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          {selectedSequence.length === 0 ? (
            <span className="text-gray-600 text-sm">Tap icons below...</span>
          ) : (
            selectedSequence.map((iconId, index) => {
              const icon = getIconById(iconId);
              return (
                <div
                  key={index}
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10"
                >
                  {icon && <icon.icon size={20} className="text-white" />}
                </div>
              );
            })
          )}
          {selectedSequence.length > 0 && selectedSequence.length < sequenceLength && (
            <button
              onClick={handleClear}
              className="ml-auto p-1.5 rounded-full hover:bg-white/10 text-gray-400"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
        {error && (
          <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
        )}
        <p className="text-gray-500 text-xs mt-2 text-center">
          {attemptsRemaining} attempts remaining
        </p>
      </div>

      <div
        className={`grid grid-cols-4 gap-2 ${isShaking ? 'animate-shake' : ''}`}
      >
        {gridIcons.map((icon, index) => {
          const IconComponent = icon.icon;
          const selectionIndex = selectedSequence.indexOf(icon.id);
          const isInSequence = selectionIndex !== -1;

          return (
            <button
              key={index}
              onClick={() => handleIconClick(icon)}
              disabled={selectedSequence.length >= sequenceLength}
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-150 relative
                ${isInSequence
                  ? 'bg-teal-500/30 ring-2 ring-teal-500'
                  : 'bg-white/10 hover:bg-white/20 active:scale-95'
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              <IconComponent
                size={28}
                className={isInSequence ? 'text-white' : 'text-gray-300'}
              />
              {isInSequence && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 rounded-full text-xs font-bold text-white flex items-center justify-center">
                  {selectionIndex + 1}
                </span>
              )}
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
