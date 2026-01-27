import React, { useState, useEffect } from 'react';
import { FiX, FiLock, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../../supabase/client';
import PinValidation from './PinValidation';
import IconGridValidation from './IconGridValidation';
import IconSequenceValidation from './IconSequenceValidation';
import IconPositionValidation from './IconPositionValidation';

export default function StaffValidationModal({
  isOpen,
  onClose,
  onSuccess,
  validationMethod,
  validationConfig,
  actionType = 'visit',
  lockoutThreshold = 3,
  isLocked = false,
  onUnlockRequest,
  onLockout,
  accountId,
  campaignId
}) {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showLockout, setShowLockout] = useState(isLocked);

  useEffect(() => {
    if (isOpen) {
      setFailedAttempts(0);
      setShowLockout(isLocked);
    }
  }, [isOpen, isLocked]);

  if (!isOpen) return null;

  const attemptsRemaining = lockoutThreshold - failedAttempts;

  const handleSuccess = () => {
    onSuccess();
  };

  const handleFailure = async () => {
    const newFailedAttempts = failedAttempts + 1;
    setFailedAttempts(newFailedAttempts);

    if (newFailedAttempts >= lockoutThreshold) {
      setShowLockout(true);
      if (accountId && campaignId) {
        try {
          const { error } = await supabase.from('validation_lockouts').insert({
            loyalty_account_id: accountId,
            campaign_id: campaignId,
            reason: 'Too many failed validation attempts'
          });
          if (error) {
            console.error('Error creating lockout record:', error);
          } else if (onLockout) {
            onLockout();
          }
        } catch (err) {
          console.error('Error creating lockout record:', err);
        }
      }
    }
  };

  const handleUnlockRequest = () => {
    if (onUnlockRequest) {
      onUnlockRequest();
    }
  };

  const renderValidation = () => {
    if (showLockout) {
      return (
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <FiLock size={40} className="text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Account Locked</h3>
          <p className="text-gray-400 text-center mb-6 max-w-xs">
            Too many failed validation attempts. Manager assistance is required to unlock.
          </p>
          <button
            onClick={handleUnlockRequest}
            className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-2 transition-colors"
          >
            <FiAlertTriangle size={18} />
            Request Manager Unlock
          </button>
        </div>
      );
    }

    const commonProps = {
      config: validationConfig,
      onSuccess: handleSuccess,
      onFailure: handleFailure,
      attemptsRemaining
    };

    switch (validationMethod) {
      case 'pin':
        return <PinValidation {...commonProps} />;
      case 'icon_single':
        return <IconGridValidation {...commonProps} />;
      case 'icon_sequence':
        return <IconSequenceValidation {...commonProps} />;
      case 'icon_position':
        return <IconPositionValidation {...commonProps} />;
      default:
        return <PinValidation {...commonProps} />;
    }
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'visit':
        return 'Confirm Visit';
      case 'redemption':
        return 'Confirm Redemption';
      default:
        return 'Staff Validation';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-secondary, #18181B)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">{getActionTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          {renderValidation()}
        </div>
      </div>
    </div>
  );
}
