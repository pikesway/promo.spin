import React, { useState } from 'react';
import { FiX, FiUnlock, FiShield, FiAlertCircle } from 'react-icons/fi';

export default function ManagerOverrideModal({ isOpen, onClose, onUnlock, memberName, unlockPin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const hasUnlockPinConfigured = unlockPin && unlockPin.length >= 4;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasUnlockPinConfigured) {
      setError('Unlock PIN has not been configured. Please contact an administrator.');
      return;
    }

    if (pin.length < 4) {
      setError('Please enter a valid PIN');
      return;
    }

    if (pin !== unlockPin) {
      setError('Incorrect PIN');
      setPin('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onUnlock(pin);
      setPin('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to unlock account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-secondary, #18181B)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FiShield className="text-amber-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Manager Override</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${hasUnlockPinConfigured ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
              {hasUnlockPinConfigured ? (
                <FiUnlock size={32} className="text-amber-400" />
              ) : (
                <FiAlertCircle size={32} className="text-red-400" />
              )}
            </div>
            {hasUnlockPinConfigured ? (
              <p className="text-gray-400 text-sm">
                Enter your unlock PIN to unlock
                {memberName && (
                  <span className="text-white font-medium"> {memberName}'s</span>
                )} account
              </p>
            ) : (
              <div>
                <p className="text-red-400 text-sm font-medium mb-2">
                  Unlock PIN Not Configured
                </p>
                <p className="text-gray-500 text-xs">
                  An administrator needs to set up the unlock PIN in the client branding settings before accounts can be unlocked.
                </p>
              </div>
            )}
          </div>

          {hasUnlockPinConfigured && (
            <div className="mb-4">
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPin(value);
                  setError('');
                }}
                placeholder="Enter unlock PIN"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
              )}
            </div>
          )}

          {!hasUnlockPinConfigured && error && (
            <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              {hasUnlockPinConfigured ? 'Cancel' : 'Close'}
            </button>
            {hasUnlockPinConfigured && (
              <button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="flex-1 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Unlock'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
