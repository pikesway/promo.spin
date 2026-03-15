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
        <p className="text-sm mb-2" style={{ color: '#374151' }}>
          Enter {maxLength}-digit PIN
        </p>
        <div
          className={`flex gap-2 justify-center ${isShaking ? 'animate-shake' : ''}`}
        >
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className="w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all duration-150"
              style={{
                borderColor: pin[i] ? '#0d9488' : '#d1d5db',
                background: pin[i] ? '#f0fdfa' : '#f9fafb',
                color: pin[i] ? '#0d9488' : '#9ca3af',
              }}
            >
              {pin[i] ? '*' : ''}
            </div>
          ))}
        </div>
        {error && (
          <p className="text-sm mt-2" style={{ color: '#dc2626' }}>{error}</p>
        )}
        <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
          {attemptsRemaining} attempts remaining
        </p>
      </div>

      <div className={`grid ${isAlphanumeric ? 'grid-cols-6 gap-1.5' : 'grid-cols-3 gap-2'} max-w-xs`}>
        {keys.map((key, index) => (
          key ? (
            <button
              key={index}
              onClick={() => handleKeyPress(key)}
              className={`${isAlphanumeric ? 'w-10 h-10 text-base' : 'w-16 h-14 text-xl'} rounded-lg font-semibold transition-colors`}
              style={{ background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
              onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseDown={e => e.currentTarget.style.background = '#d1d5db'}
              onMouseUp={e => e.currentTarget.style.background = '#e5e7eb'}
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
          className="w-16 h-14 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
          onMouseEnter={e => { if (pin) e.currentTarget.style.background = '#e5e7eb'; }}
          onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
        >
          <FiDelete size={24} />
        </button>
        <button
          onClick={handleSubmit}
          disabled={pin.length !== maxLength}
          className="w-24 h-14 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#0d9488', color: '#ffffff' }}
          onMouseEnter={e => { if (pin.length === maxLength) e.currentTarget.style.background = '#0f766e'; }}
          onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
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