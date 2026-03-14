import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiGift, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../supabase/client';
import QRCode from 'qrcode.react';
import StaffValidationModal from '../components/loyalty/StaffValidationModal';
import ManagerOverrideModal from '../components/loyalty/ManagerOverrideModal';
import { LOYALTY_ICONS, getIconById } from '../constants/loyaltyIcons';

function getDeviceTokenKey(campaignSlug) {
  return `loyalty_device_${campaignSlug}`;
}

export default function LoyaltyCardPage() {
  const { campaignSlug, memberCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [client, setClient] = useState(null);
  const [loyaltyProgram, setLoyaltyProgram] = useState(null);
  const [account, setAccount] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [actionType, setActionType] = useState('visit');
  const [successAnimation, setSuccessAnimation] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*, clients(*)')
        .eq('slug', campaignSlug)
        .eq('type', 'loyalty')
        .maybeSingle();

      if (campaignError) throw campaignError;
      if (!campaignData) {
        setError('Loyalty program not found');
        return;
      }

      setCampaign(campaignData);
      setClient(campaignData.clients);

      const { data: programData, error: programError } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .maybeSingle();

      if (programError) throw programError;
      setLoyaltyProgram(programData || campaignData.config?.loyalty);

      if (memberCode) {
        const { data: accountData, error: accountError } = await supabase
          .from('loyalty_accounts')
          .select('*')
          .eq('member_code', memberCode)
          .eq('campaign_id', campaignData.id)
          .maybeSingle();

        if (accountError) throw accountError;
        if (!accountData) {
          setError('Member not found');
          return;
        }

        setAccount(accountData);

        const tokenKey = getDeviceTokenKey(campaignSlug);
        const storedToken = localStorage.getItem(tokenKey);
        if (storedToken) {
          supabase
            .from('loyalty_device_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('device_token', storedToken)
            .then(() => {});
        }

        const { data: lockoutData } = await supabase
          .from('validation_lockouts')
          .select('*')
          .eq('loyalty_account_id', accountData.id)
          .is('unlocked_at', null)
          .maybeSingle();

        setIsLocked(!!lockoutData);
      }
    } catch (err) {
      console.error('Error loading loyalty card:', err);
      setError('Failed to load loyalty card');
    } finally {
      setLoading(false);
    }
  }, [campaignSlug, memberCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmAction = (type) => {
    if (isLocked) {
      setShowManagerOverride(true);
      return;
    }
    setActionType(type);
    setShowValidation(true);
  };

  const handleValidationSuccess = async () => {
    setShowValidation(false);

    try {
      const threshold = loyaltyProgram?.threshold || campaign?.config?.loyalty?.threshold || 10;
      const newProgress = (account.current_progress || 0) + 1;
      const rewardUnlocked = newProgress >= threshold;

      const { error: updateError } = await supabase
        .from('loyalty_accounts')
        .update({
          current_progress: newProgress,
          total_visits: (account.total_visits || 0) + 1,
          reward_unlocked: rewardUnlocked,
          reward_unlocked_at: rewardUnlocked ? new Date().toISOString() : null
        })
        .eq('id', account.id);

      if (updateError) throw updateError;

      await supabase.from('loyalty_progress_log').insert({
        loyalty_account_id: account.id,
        campaign_id: campaign.id,
        action_type: rewardUnlocked ? 'reward_unlocked' : 'visit_confirmed',
        quantity: 1
      });

      setSuccessAnimation(true);
      setTimeout(() => {
        setSuccessAnimation(false);
        fetchData();
      }, 1500);
    } catch (err) {
      console.error('Error confirming visit:', err);
      alert('Failed to confirm visit');
    }
  };

  const handleRedeemReward = async () => {
    if (isLocked) {
      setShowManagerOverride(true);
      return;
    }
    setActionType('redemption');
    setShowValidation(true);
  };

  const handleRedemptionSuccess = async () => {
    setShowValidation(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-loyalty-action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            memberCode: account.member_code,
            campaignId: campaign.id,
            actionType: 'redemption',
            deviceInfo: {
              userAgent: navigator.userAgent,
              timestamp: Date.now(),
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to redeem reward');
      }

      navigate(`/redeem/${result.shortCode}?token=${result.redemptionToken}`);
    } catch (err) {
      console.error('Error redeeming reward:', err);
      alert('Failed to redeem reward');
    }
  };

  const handleUnlockRequest = () => {
    setShowValidation(false);
    setShowManagerOverride(true);
  };

  const handleManagerUnlock = async (managerPin) => {
    const { data: lockout } = await supabase
      .from('validation_lockouts')
      .select('*')
      .eq('loyalty_account_id', account.id)
      .is('unlocked_at', null)
      .maybeSingle();

    if (lockout) {
      await supabase
        .from('validation_lockouts')
        .update({ unlocked_at: new Date().toISOString() })
        .eq('id', lockout.id);
    }

    setIsLocked(false);
    setShowManagerOverride(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your loyalty card...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Something went wrong'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const threshold = loyaltyProgram?.threshold || campaign?.config?.loyalty?.threshold || 10;
  const currentProgress = account.current_progress || 0;
  const stampsRemaining = threshold - currentProgress;
  const rewardUnlocked = account.reward_unlocked;

  const primaryColor = client?.primary_color || campaign?.config?.visual?.background?.gradientStart || '#F59E0B';
  const backgroundColor = client?.background_color || campaign?.config?.visual?.background?.color || '#18181B';

  const loyaltyConfig = loyaltyProgram || campaign?.config?.loyalty || {};
  const validationMethod = loyaltyConfig.validation_method || loyaltyConfig.validationMethod || 'pin';
  const validationConfig = loyaltyConfig.validation_config || loyaltyConfig.validationConfig || {};

  const cardConfig = loyaltyConfig.card || {};
  const stampIcon = cardConfig.stampIcon || 'star';
  const customIconUrl = cardConfig.customIconUrl || '';
  const useCustomIcon = stampIcon === 'custom' && customIconUrl;
  const iconData = getIconById(stampIcon) || LOYALTY_ICONS[0];
  const StampIconComponent = iconData?.icon || FiCheck;

  return (
    <div
      className="min-h-screen flex flex-col items-center py-6 px-4"
      style={{ background: backgroundColor }}
    >
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl overflow-hidden shadow-xl"
          style={{ background: primaryColor }}
        >
          <div className="p-4 text-center">
            {client?.logo_url && (
              <img
                src={client.logo_url}
                alt={client.name}
                className="h-12 mx-auto mb-2 object-contain"
              />
            )}
            <h1 className="text-white font-bold text-lg">{client?.name || 'Loyalty Program'}</h1>
            <p className="text-white/80 text-sm mt-1">
              {loyaltyConfig.reward_name || loyaltyConfig.rewardName || 'Free Reward'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur p-4">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Array.from({ length: threshold }).map((_, index) => {
                const isFilled = index < currentProgress;
                return (
                  <div
                    key={index}
                    className={`
                      aspect-square rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${successAnimation && index === currentProgress - 1 ? 'scale-125' : ''}
                      ${isFilled
                        ? 'bg-white shadow-lg'
                        : 'bg-white/20 border-2 border-white/30'
                      }
                    `}
                  >
                    {isFilled && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: useCustomIcon ? 'transparent' : primaryColor }}
                      >
                        {useCustomIcon ? (
                          <img
                            src={customIconUrl}
                            alt=""
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <StampIconComponent className="text-white" size={14} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center text-white">
              {rewardUnlocked ? (
                <p className="font-semibold flex items-center justify-center gap-2">
                  <FiGift className="text-yellow-300" />
                  Reward Ready!
                </p>
              ) : (
                <p className="text-sm">
                  <span className="font-bold text-lg">{stampsRemaining}</span>
                  <span className="opacity-80"> stamps until your reward</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <QRCode
                  value={`${window.location.origin}/loyalty/${campaignSlug}/${memberCode}`}
                  size={80}
                  level="M"
                />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Member ID</p>
                <p className="font-mono font-bold text-gray-900 text-lg tracking-wider">
                  {memberCode}
                </p>
                <p className="text-gray-500 text-xs mt-1">{account.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rewardUnlocked ? (
            <button
              onClick={handleRedeemReward}
              className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              <FiGift size={20} />
              Redeem Your Reward
            </button>
          ) : (
            <button
              onClick={() => handleConfirmAction('visit')}
              className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              <FiCheck size={20} />
              Confirm {loyaltyConfig.program_type === 'action' || loyaltyConfig.programType === 'action' ? 'Purchase' : 'Visit'}
            </button>
          )}

          <button
            onClick={fetchData}
            className="w-full py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center gap-2 transition-colors"
          >
            <FiRefreshCw size={16} />
            Refresh Card
          </button>
        </div>

        {isLocked && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
            <p className="text-red-300 text-sm text-center">
              This card is temporarily locked. Please ask staff for assistance.
            </p>
          </div>
        )}
      </div>

      <StaffValidationModal
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        onSuccess={actionType === 'redemption' ? handleRedemptionSuccess : handleValidationSuccess}
        validationMethod={validationMethod}
        validationConfig={validationConfig}
        actionType={actionType}
        lockoutThreshold={loyaltyConfig.lockout_threshold || loyaltyConfig.lockoutThreshold || 3}
        isLocked={isLocked}
        onUnlockRequest={handleUnlockRequest}
        onLockout={() => setIsLocked(true)}
        accountId={account?.id}
        campaignId={campaign?.id}
      />

      <ManagerOverrideModal
        isOpen={showManagerOverride}
        onClose={() => setShowManagerOverride(false)}
        onUnlock={handleManagerUnlock}
        memberName={account?.name}
        unlockPin={client?.unlock_pin}
      />
    </div>
  );
}