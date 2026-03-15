import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiGift, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
  const [rewardTiers, setRewardTiers] = useState([]);
  const [birthdayEligible, setBirthdayEligible] = useState(false);
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [actionType, setActionType] = useState('visit');
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [redeemingBirthday, setRedeemingBirthday] = useState(false);

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

      const [programResult, tiersResult] = await Promise.all([
        supabase
          .from('loyalty_programs')
          .select('*')
          .eq('campaign_id', campaignData.id)
          .maybeSingle(),
        supabase
          .from('campaign_rewards')
          .select('*')
          .eq('campaign_id', campaignData.id)
          .eq('active', true)
          .order('threshold', { ascending: true }),
      ]);

      if (programResult.error) throw programResult.error;
      const programData = programResult.data || campaignData.config?.loyalty;
      setLoyaltyProgram(programData);
      setRewardTiers(tiersResult.data || []);

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

        if (programData?.birthday_reward_enabled && accountData.birthday) {
          const now = new Date();
          const bday = new Date(accountData.birthday);
          if ((bday.getUTCMonth() + 1) === (now.getUTCMonth() + 1)) {
            const currentYear = now.getUTCFullYear();
            const currentMonth = now.getUTCMonth() + 1;
            const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).toISOString();
            const monthEnd = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59)).toISOString();
            const { data: existingBday } = await supabase
              .from('loyalty_redemptions')
              .select('id')
              .eq('loyalty_account_id', accountData.id)
              .eq('redemption_source', 'birthday')
              .gte('created_at', monthStart)
              .lte('created_at', monthEnd)
              .maybeSingle();
            setBirthdayEligible(!existingBday);
          } else {
            setBirthdayEligible(false);
          }
        }

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

  const handleRedeemBirthday = async () => {
    setRedeemingBirthday(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-birthday-reward`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            memberCode: account.member_code,
            campaignId: campaign.id,
            deviceInfo: { userAgent: navigator.userAgent, timestamp: Date.now() },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to redeem birthday reward');
      }

      navigate(`/redeem/${result.shortCode}?token=${result.redemptionToken}`);
    } catch (err) {
      console.error('Error redeeming birthday reward:', err);
      alert(err.message || 'Failed to redeem birthday reward');
    } finally {
      setRedeemingBirthday(false);
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
  const isPaused = campaign.status === 'paused';

  const loyaltyConfig = loyaltyProgram || campaign?.config?.loyalty || {};
  const validationMethod = loyaltyConfig.validation_method || loyaltyConfig.validationMethod || 'pin';
  const validationConfig = loyaltyConfig.validation_config || loyaltyConfig.validationConfig || {};

  const cardConfig = loyaltyConfig.card || {};
  const primaryColor = cardConfig.primaryColor || client?.primary_color || '#F59E0B';
  const backgroundColor = cardConfig.backgroundColor || client?.background_color || '#18181B';
  const stampIcon = cardConfig.stampIcon || 'star';
  const customIconUrl = cardConfig.customIconUrl || '';
  const useCustomIcon = stampIcon === 'custom' && customIconUrl;
  const iconData = getIconById(stampIcon) || LOYALTY_ICONS[0];
  const StampIconComponent = iconData?.icon || FiCheck;

  const headingColor = cardConfig.headingColor || '#FFFFFF';
  const bodyColor = cardConfig.bodyColor || '#FFFFFF';
  const buttonTextColor = cardConfig.buttonTextColor || '#FFFFFF';
  const stampFilledColor = cardConfig.stampFilledColor || '#FFFFFF';
  const stampEmptyColor = cardConfig.stampEmptyColor || 'rgba(255,255,255,0.2)';

  const activeTiers = rewardTiers.length > 0 ? rewardTiers : [];
  const nextTier = activeTiers.find(t => t.threshold > currentProgress);
  const unlockedTiers = activeTiers.filter(t => t.threshold <= currentProgress);
  const rewardUnlocked = account.reward_unlocked || unlockedTiers.length > 0;

  const stampsUntilNext = nextTier ? nextTier.threshold - currentProgress : (threshold - currentProgress);
  const displayThreshold = nextTier ? nextTier.threshold : threshold;

  return (
    <div
      className="min-h-screen flex flex-col items-center py-6 px-4"
      style={{ background: backgroundColor }}
    >
      <div className="w-full max-w-sm">
        {birthdayEligible && (
          <div
            className="mb-4 rounded-xl p-4 text-center"
            style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)', color: '#fff' }}
          >
            <p className="text-lg font-bold mb-1">Happy Birthday!</p>
            <p className="text-sm opacity-90 mb-3">
              {loyaltyProgram?.birthday_reward_name
                ? `Claim your ${loyaltyProgram.birthday_reward_name}`
                : 'You have a birthday reward waiting for you!'}
            </p>
            <button
              onClick={handleRedeemBirthday}
              disabled={redeemingBirthday}
              className="w-full py-2 rounded-lg font-semibold text-sm transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
            >
              {redeemingBirthday ? 'Claiming...' : 'Claim Birthday Reward'}
            </button>
          </div>
        )}

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
            <h1 className="font-bold text-lg" style={{ color: headingColor }}>
              {client?.name || 'Loyalty Program'}
            </h1>
            {nextTier ? (
              <p className="text-sm mt-1" style={{ color: bodyColor, opacity: 0.9 }}>
                {nextTier.reward_name}
              </p>
            ) : (
              <p className="text-sm mt-1" style={{ color: bodyColor, opacity: 0.9 }}>
                {loyaltyConfig.reward_name || loyaltyConfig.rewardName || 'Free Reward'}
              </p>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur p-4">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Array.from({ length: displayThreshold }).map((_, index) => {
                const isFilled = index < currentProgress;
                return (
                  <div
                    key={index}
                    className={`
                      aspect-square rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${successAnimation && index === currentProgress - 1 ? 'scale-125' : ''}
                      ${isFilled ? 'shadow-lg' : 'border-2'}
                    `}
                    style={{
                      backgroundColor: isFilled ? stampFilledColor : 'transparent',
                      borderColor: !isFilled ? stampEmptyColor : 'transparent'
                    }}
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
                          <StampIconComponent style={{ color: '#FFFFFF' }} size={14} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              {rewardUnlocked && !nextTier ? (
                <p className="font-semibold flex items-center justify-center gap-2" style={{ color: bodyColor }}>
                  <FiGift className="text-yellow-300" />
                  <span>Reward Ready!</span>
                </p>
              ) : nextTier ? (
                <p className="text-sm" style={{ color: bodyColor }}>
                  <span className="font-bold text-lg" style={{ color: bodyColor }}>{stampsUntilNext}</span>
                  <span style={{ color: bodyColor, opacity: 0.8 }}> more for </span>
                  <span className="font-semibold" style={{ color: bodyColor }}>{nextTier.reward_name}</span>
                </p>
              ) : (
                <p className="text-sm" style={{ color: bodyColor }}>
                  <span className="font-bold text-lg" style={{ color: bodyColor }}>{stampsUntilNext}</span>
                  <span style={{ color: bodyColor, opacity: 0.8 }}> stamps until your reward</span>
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

        {activeTiers.length > 1 && (
          <div
            className="mt-3 rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <button
              onClick={() => setShowAllTiers(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
              style={{ color: bodyColor }}
            >
              <span className="text-sm font-medium">Reward Tiers</span>
              {showAllTiers ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            {showAllTiers && (
              <div className="px-4 pb-3 space-y-2">
                {activeTiers.map((tier) => {
                  const earned = currentProgress >= tier.threshold;
                  return (
                    <div
                      key={tier.id}
                      className="flex items-center justify-between py-2 border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: earned ? stampFilledColor : 'transparent',
                            border: earned ? 'none' : `2px solid ${stampEmptyColor}`
                          }}
                        >
                          {earned && <FiCheck size={12} style={{ color: primaryColor }} />}
                        </div>
                        <span className="text-sm font-medium" style={{ color: bodyColor, opacity: earned ? 1 : 0.7 }}>
                          {tier.reward_name}
                        </span>
                      </div>
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{
                          background: earned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                          color: bodyColor,
                          opacity: earned ? 1 : 0.6
                        }}
                      >
                        {tier.threshold} stamps
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isPaused && (
          <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
            <p className="text-yellow-300 text-sm text-center font-medium mb-1">
              Program Temporarily Paused
            </p>
            <p className="text-yellow-200 text-xs text-center" style={{ opacity: 0.8 }}>
              New visits cannot be confirmed at this time. {rewardUnlocked && 'You can still redeem your earned reward.'}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {rewardUnlocked ? (
            <button
              onClick={handleRedeemReward}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: primaryColor, color: buttonTextColor }}
            >
              <FiGift size={20} />
              Redeem Your Reward
            </button>
          ) : !isPaused ? (
            <button
              onClick={() => handleConfirmAction('visit')}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: primaryColor, color: buttonTextColor }}
            >
              <FiCheck size={20} />
              Confirm {loyaltyConfig.program_type === 'action' || loyaltyConfig.programType === 'action' ? 'Purchase' : 'Visit'}
            </button>
          ) : null}

          <button
            onClick={fetchData}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
            style={{ color: bodyColor, opacity: 0.7 }}
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
