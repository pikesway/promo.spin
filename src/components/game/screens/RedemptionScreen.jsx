import React, { useState, useEffect } from 'react';
import { useRedemption } from '../../../context/RedemptionContext';
import SafeIcon from '../../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiClock, FiCheckCircle, FiAlertCircle, FiLock } = FiIcons;

const RedemptionScreen = ({ game, redemptionId }) => {
  const { getRedemption, redeemCoupon } = useRedemption();
  const [redemption, setRedemption] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [confirming, setConfirming] = useState(false);

  const fonts = game.visual?.fonts || {};
  const settings = game.screens?.redemption || {};

  // Resolve button style
  const globalButton = game.visual?.buttons || {};
  const buttonStyle = {
    fontFamily: fonts.primary,
    backgroundColor: (settings.useCustomButtonColor ? settings.buttonColor : globalButton.backgroundColor) || '#2563eb',
    color: (settings.useCustomButtonColor ? settings.buttonTextColor : globalButton.textColor) || '#ffffff',
  };

  useEffect(() => {
    if (redemptionId) {
      const data = getRedemption(redemptionId);
      setRedemption(data);
    }
  }, [redemptionId, getRedemption]);

  // Timer effect
  useEffect(() => {
    const isActive = redemption?.status === 'active' || redemption?.status === 'valid';
    if (!redemption || !isActive || !redemption.expiresAt) return;

    const timer = setInterval(() => {
      const now = new Date();
      const end = new Date(redemption.expiresAt);
      const diff = end - now;

      if (diff <= 0) {
        setRedemption(prev => ({ ...prev, status: 'expired' }));
        clearInterval(timer);
      } else {
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const hours = Math.floor((diff / 1000 / 60 / 60));
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [redemption]);

  const handleRedeem = () => {
    if (confirming) {
      redeemCoupon(redemption.id);
      // Refresh local state
      setRedemption(prev => ({ ...prev, status: 'redeemed', redeemedAt: new Date().toISOString() }));
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  if (!redemption) return <div className="p-8 text-center">Loading coupon...</div>;

  const getStatusColor = () => {
    switch (redemption.status) {
      case 'active':
      case 'valid': return 'blue';
      case 'redeemed': return 'green';
      case 'expired': return 'gray';
      case 'voided': return 'red';
      default: return 'gray';
    }
  };

  const isActiveStatus = redemption.status === 'active' || redemption.status === 'valid';

  const statusColor = getStatusColor();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden max-w-sm w-full relative">
        {/* Header Status Bar */}
        <div className={`py-4 px-6 text-center text-white font-bold text-lg uppercase tracking-wide bg-${statusColor}-600 transition-colors duration-500`}>
          {isActiveStatus ? 'Valid Coupon' :
           redemption.status === 'redeemed' ? 'Redeemed' :
           redemption.status === 'expired' ? 'Expired' : 'Voided'}
        </div>

        <div className="p-8 text-center">
          {/* Prize Info */}
          <div className="mb-8">
            <h2 className="text-gray-500 text-sm uppercase tracking-wider mb-2" style={{ fontFamily: fonts.secondary }}>Prize</h2>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight" style={{ fontFamily: fonts.primary }}>
              {redemption.prizeName}
            </h1>
            <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded text-xs font-mono text-gray-600">
              #{redemption.shortCode}
            </div>
          </div>

          {/* Status Icon/Visual */}
          <div className="mb-8 flex justify-center">
            {isActiveStatus && (
              <div className="w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center border-4 border-blue-100 animate-pulse">
                <SafeIcon icon={FiLock} className="w-12 h-12 text-blue-500" />
              </div>
            )}
            {redemption.status === 'redeemed' && (
              <div className="w-32 h-32 rounded-full bg-green-50 flex items-center justify-center border-4 border-green-100">
                <SafeIcon icon={FiCheckCircle} className="w-16 h-16 text-green-500" />
              </div>
            )}
            {redemption.status === 'expired' && (
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                <SafeIcon icon={FiClock} className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Timer */}
          {isActiveStatus && redemption.expiresAt && (
            <div className="mb-8">
              <p className="text-red-500 font-bold text-xl tabular-nums animate-pulse">
                Expires in: {timeLeft || '...'}
              </p>
            </div>
          )}

          {/* Instructions */}
          {isActiveStatus && (
            <p className="text-gray-600 mb-6 text-sm" style={{ fontFamily: fonts.secondary }}>
              {confirming
                ? "Staff member: Please confirm you are redeeming this coupon now. This cannot be undone."
                : (settings.instructions || "Show this screen to a staff member to redeem your prize.")}
            </p>
          )}

          {/* Action Button */}
          <div className="space-y-3">
            {isActiveStatus ? (
              <>
                <button 
                  onClick={handleRedeem}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2 ${
                    confirming ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : ''
                  }`}
                  style={confirming ? {} : buttonStyle}
                >
                  {confirming ? (
                    <>
                      <SafeIcon icon={FiAlertCircle} className="w-5 h-5" />
                      <span>Confirm Redemption</span>
                    </>
                  ) : (
                    settings.buttonText || 'Redeem Now'
                  )}
                </button>
                {confirming && (
                  <button 
                    onClick={() => setConfirming(false)}
                    className="text-gray-500 text-sm hover:text-gray-700 underline"
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-500 text-sm">
                  {redemption.status === 'redeemed' 
                    ? `Redeemed on ${new Date(redemption.redeemedAt).toLocaleDateString()} at ${new Date(redemption.redeemedAt).toLocaleTimeString()}`
                    : 'This coupon is no longer valid.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">ID: {redemption.id}</p>
        </div>
      </div>
    </div>
  );
};

export default RedemptionScreen;