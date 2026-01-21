import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiClock, FiGift, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../supabase/client';

const STATUS_CONFIG = {
  valid: {
    icon: FiGift,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    label: 'Valid',
  },
  redeemed: {
    icon: FiCheck,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    label: 'Redeemed',
  },
  expired: {
    icon: FiClock,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    label: 'Expired',
  },
};

export default function RedemptionPage() {
  const { shortCode } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [redemption, setRedemption] = useState(null);
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  useEffect(() => {
    if (shortCode && token) {
      fetchRedemption();
    } else {
      setError('Invalid link. Please check your email for the correct link.');
      setLoading(false);
    }
  }, [shortCode, token]);

  async function fetchRedemption() {
    try {
      const { data: redemptionData, error: redemptionError } = await supabase
        .from('redemptions')
        .select(`
          id,
          prize_name,
          short_code,
          redemption_token,
          token_expires_at,
          status,
          redeemed_at,
          client_id
        `)
        .eq('short_code', shortCode)
        .maybeSingle();

      if (redemptionError) {
        throw redemptionError;
      }

      if (!redemptionData) {
        setError('Coupon not found. Please check your link.');
        setLoading(false);
        return;
      }

      if (redemptionData.redemption_token !== token) {
        setError('Invalid access token. Please use the link from your email.');
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = redemptionData.token_expires_at
        ? new Date(redemptionData.token_expires_at)
        : null;

      if (expiresAt && now > expiresAt && redemptionData.status === 'valid') {
        redemptionData.status = 'expired';
      }

      setRedemption(redemptionData);

      if (redemptionData.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name, logo_url, primary_color, secondary_color, background_color')
          .eq('id', redemptionData.client_id)
          .maybeSingle();

        if (clientData) {
          setClient(clientData);
        }
      }
    } catch (err) {
      console.error('Error fetching redemption:', err);
      setError('Failed to load coupon. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    setRedeeming(true);
    setShowConfirmDialog(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-redeemed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            shortCode,
            token,
            redeemedBy: 'cashier',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.status === 'redeemed') {
          setRedemption(prev => ({ ...prev, status: 'redeemed' }));
        } else if (result.status === 'expired') {
          setRedemption(prev => ({ ...prev, status: 'expired' }));
        }
        throw new Error(result.message || result.error);
      }

      setRedeemSuccess(true);
      setRedemption(prev => ({
        ...prev,
        status: 'redeemed',
        redeemed_at: result.redeemedAt,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRedeeming(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getTimeRemaining() {
    if (!redemption?.token_expires_at) return null;
    const now = new Date();
    const expires = new Date(redemption.token_expires_at);
    const diff = expires - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    return 'Expiring soon';
  }

  const primaryColor = client?.primary_color || '#3b82f6';
  const secondaryColor = client?.secondary_color || '#1d4ed8';
  const bgColor = client?.background_color || '#09090b';

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error && !redemption) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <FiAlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[redemption.status] || STATUS_CONFIG.valid;
  const StatusIcon = statusConfig.icon;
  const timeRemaining = getTimeRemaining();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="py-6 px-4"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
        }}
      >
        <div className="max-w-md mx-auto text-center">
          {client?.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-12 mx-auto object-contain"
            />
          ) : (
            <h2 className="text-xl font-bold text-white">{client?.name || 'Your Prize'}</h2>
          )}
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 overflow-hidden"
          >
            <div className={`px-4 py-3 ${statusConfig.bg} border-b ${statusConfig.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                <span className={`font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              {redemption.status === 'valid' && timeRemaining && (
                <span className="text-sm text-zinc-400">{timeRemaining}</span>
              )}
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Your Prize</p>
                <h1 className="text-2xl font-bold text-white">{redemption.prize_name}</h1>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                <p className="text-xs text-zinc-500 uppercase tracking-wider text-center mb-2">
                  Redemption Code
                </p>
                <p className="text-3xl font-mono font-bold text-white text-center tracking-widest">
                  {redemption.short_code}
                </p>
              </div>

              {redemption.status === 'valid' && (
                <>
                  <p className="text-center text-zinc-400 text-sm mb-6">
                    Show this screen to the cashier to redeem your prize
                  </p>

                  <button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={redeeming}
                    className="w-full py-4 rounded-xl font-semibold text-white text-lg transition-all disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  >
                    {redeeming ? 'Processing...' : 'Mark as Redeemed'}
                  </button>

                  {redemption.token_expires_at && (
                    <p className="text-center text-zinc-500 text-xs mt-4">
                      Expires: {formatDate(redemption.token_expires_at)}
                    </p>
                  )}
                </>
              )}

              {redemption.status === 'redeemed' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <FiCheck className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-zinc-300 mb-2">This coupon has been redeemed</p>
                  {redemption.redeemed_at && (
                    <p className="text-zinc-500 text-sm">
                      {formatDate(redemption.redeemed_at)}
                    </p>
                  )}
                </div>
              )}

              {redemption.status === 'expired' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <FiClock className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-zinc-300 mb-2">This coupon has expired</p>
                  {redemption.token_expires_at && (
                    <p className="text-zinc-500 text-sm">
                      Expired on {formatDate(redemption.token_expires_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {error && redemption && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30"
            >
              <p className="text-red-400 text-sm text-center">{error}</p>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-zinc-800"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-2">Confirm Redemption</h3>
              <p className="text-zinc-400 mb-6">
                This action cannot be undone. Only tap confirm when the customer is ready to receive their prize.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeem}
                  className="flex-1 py-3 rounded-xl font-medium text-white transition-colors"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {redeemSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-sm w-full border border-zinc-800 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                <FiCheck className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
              <p className="text-zinc-400">
                The coupon has been redeemed. Thank you for your visit!
              </p>
              <button
                onClick={() => setRedeemSuccess(false)}
                className="mt-6 px-6 py-3 rounded-xl font-medium text-white transition-colors"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
