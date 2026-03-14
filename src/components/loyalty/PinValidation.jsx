import React, { useState, useCallback } from 'react';
import { FiDelete, FiCheck } from 'react-icons/fi';

export default function PinValidation({ config, onSuccess, onFailure, attemptsRemaining }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const maxLength = config?.pinLength || 4;
  const isAlphanumeric = config?.pinType === 'alphanumeric';

  const handleKeyPress = useCallback((key) => {
    if (pin.length < maxLength) {
      setPin(prev => prev + key);
      setError('');
    }
  }, [pin, maxLength]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, []);

  const handleSubmit = useCallback(() => {
    const correctPin = config?.pinValue || '';

    if (pin.toUpperCase() === correctPin.toUpperCase()) {
      onSuccess();
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setError('Incorrect PIN');
      setPin('');
      onFailure();
    }
  }, [pin, config, onSuccess, onFailure]);

  const numericKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];
  const alphanumericKeys = [
    '1', '2', '3', 'A', 'B', 'C',
    '4', '5', '6', 'D', 'E', 'F',
    '7', '8', '9', 'G', 'H', 'J',
    '', '0', '', 'K', 'L', 'M'
  ];

  const keys = isAlphanumeric ? alphanumericKeys : numericKeys;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 text-center">
        <p className="text-gray-400 text-sm mb-2">
          Enter {maxLength}-digit PIN
        </p>
        <div
          className={`flex gap-2 justify-center ${isShaking ? 'animate-shake' : ''}`}
        >
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className={`
                w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold
                ${pin[i] ? 'border-teal-500 bg-teal-500/10 text-white' : 'border-white/20 bg-white/5 text-gray-500'}
                transition-all duration-150
              `}
            >
              {pin[i] ? '*' : ''}
            </div>
          ))}
        </div>
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          {attemptsRemaining} attempts remaining
        </p>
      </div>

      <div className={`grid ${isAlphanumeric ? 'grid-cols-6 gap-1.5' : 'grid-cols-3 gap-2'} max-w-xs`}>
        {keys.map((key, index) => (
          key ? (
            <button
              key={index}
              onClick={() => handleKeyPress(key)}
              className={`
                ${isAlphanumeric ? 'w-10 h-10 text-base' : 'w-16 h-14 text-xl'}
                rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30
                text-white font-semibold transition-colors
              `}
            >
              {key}
            </button>
          ) : (
            <div key={index} className={isAlphanumeric ? 'w-10 h-10' : 'w-16 h-14'} />
          )
        ))}
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={handleDelete}
          disabled={!pin}
          className="w-16 h-14 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
        >
          <FiDelete size={24} />
        </button>
        <button
          onClick={handleSubmit}
          disabled={pin.length !== maxLength}
          className="w-24 h-14 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <FiCheck size={20} />
          Submit
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