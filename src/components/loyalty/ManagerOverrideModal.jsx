import React, { useState } from 'react';
import { FiX, FiUnlock, FiShield } from 'react-icons/fi';

export default function ManagerOverrideModal({ isOpen, onClose, onUnlock, memberName }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pin.length < 4) {
      setError('Please enter a valid manager PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onUnlock(pin);
      setPin('');
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid manager PIN');
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
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <FiUnlock size={32} className="text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm">
              Enter your manager PIN to unlock
              {memberName && (
                <span className="text-white font-medium"> {memberName}'s</span>
              )} account
            </p>
          </div>

          <div className="mb-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="Enter manager PIN"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest placeholder-gray-500 focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length < 4}
              className="flex-1 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
