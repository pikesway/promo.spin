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
        style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)' }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <FiShield className="text-amber-400" size={20} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Manager Override</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
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
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enter your unlock PIN to unlock
                {memberName && (
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}> {memberName}'s</span>
                )} account
              </p>
            ) : (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--error)' }}>
                  Unlock PIN Not Configured
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
                className="input w-full text-center text-lg tracking-widest font-mono"
                autoFocus
              />
              {error && (
                <p className="text-sm mt-2 text-center" style={{ color: 'var(--error)' }}>{error}</p>
              )}
            </div>
          )}

          {!hasUnlockPinConfigured && error && (
            <p className="text-sm mb-4 text-center" style={{ color: 'var(--error)' }}>{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
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