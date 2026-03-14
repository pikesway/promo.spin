import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiGift, FiClock, FiRefreshCw, FiMail, FiUser, FiCalendar, FiHash } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabase/client';

const ACTION_CONFIG = {
  visit_confirmed: {
    icon: FiCheck,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    label: 'Visit Confirmed',
  },
  reward_unlocked: {
    icon: FiGift,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    label: 'Reward Unlocked',
  },
  reward_redeemed: {
    icon: FiGift,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    label: 'Reward Redeemed',
  },
  progress_reset: {
    icon: FiRefreshCw,
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    label: 'Progress Reset',
  },
};

const REDEMPTION_STATUS = {
  valid: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Valid' },
  redeemed: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Redeemed' },
  expired: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Expired' },
};

export default function MemberActivityModal({ isOpen, onClose, member, campaign }) {
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [activeTab, setActiveTab] = useState('activity');

  useEffect(() => {
    if (isOpen && member) {
      fetchMemberData();
    }
  }, [isOpen, member]);

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      const { data: logData, error: logError } = await supabase
        .from('loyalty_progress_log')
        .select('*')
        .eq('loyalty_account_id', member.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logError) throw logError;
      setActivityLog(logData || []);

      const { data: redemptionData, error: redemptionError } = await supabase
        .from('loyalty_redemptions')
        .select('*, redemptions(prize_name, status, redeemed_at)')
        .eq('loyalty_account_id', member.id)
        .order('created_at', { ascending: false });

      if (redemptionError) throw redemptionError;
      setRedemptions(redemptionData || []);
    } catch (err) {
      console.error('Error fetching member data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  const threshold = campaign?.config?.loyalty?.threshold || 10;
  const defaultRewardName = campaign?.config?.loyalty?.reward_name || campaign?.config?.loyalty?.rewardName || 'Free Reward';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
          style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Member Details</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <FiUser className="text-rose-400" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</h3>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <FiMail size={14} />
                  <span className="truncate">{member.email}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {member.current_progress}/{threshold}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Progress</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{member.total_visits || 0}</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Visits</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-lg font-bold text-amber-400">{redemptions.length}</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Rewards Earned</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-lg font-bold text-green-400">
                  {redemptions.filter(r => r.status === 'redeemed' || r.redemptions?.status === 'redeemed').length}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Redeemed</div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <div className="flex items-center gap-1">
                <FiHash size={12} />
                <span className="font-mono">{member.member_code}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiCalendar size={12} />
                <span>Enrolled {formatShortDate(member.enrolled_at)}</span>
              </div>
              {member.reward_unlocked && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                  Reward Ready
                </span>
              )}
            </div>
          </div>

          <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('activity')}
              className="flex-1 py-3 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: activeTab === 'activity' ? '2px solid var(--brand-primary)' : '2px solid transparent'
              }}
            >
              Activity Log
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className="flex-1 py-3 text-sm font-medium transition-colors"
              style={{
                color: activeTab === 'rewards' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: activeTab === 'rewards' ? '2px solid var(--brand-primary)' : '2px solid transparent'
              }}
            >
              Rewards ({redemptions.length})
            </button>
          </div>

          <div className="overflow-y-auto max-h-[40vh] p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-primary)' }} />
              </div>
            ) : activeTab === 'activity' ? (
              activityLog.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>No activity recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {activityLog.map((log) => {
                    const config = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.visit_confirmed;
                    const Icon = config.icon;

                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
                          <Icon className={config.color} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{config.label}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(log.created_at)}</p>
                        </div>
                        {log.quantity > 1 && (
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>x{log.quantity}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : redemptions.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>No rewards earned yet</p>
            ) : (
              <div className="space-y-3">
                {redemptions.map((redemption) => {
                  const status = redemption.redemptions?.status || redemption.status;
                  const statusConfig = REDEMPTION_STATUS[status] || REDEMPTION_STATUS.valid;
                  const prizeName = redemption.redemptions?.prize_name || defaultRewardName;
                  const isExpired = redemption.expires_at && new Date(redemption.expires_at) < new Date() && status === 'valid';
                  const displayStatus = isExpired ? REDEMPTION_STATUS.expired : statusConfig;

                  return (
                    <div
                      key={redemption.id}
                      className="p-4 rounded-xl"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{prizeName}</p>
                          <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{redemption.short_code}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${displayStatus.bg} ${displayStatus.color}`}>
                          {displayStatus.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <div className="flex items-center gap-1">
                          <FiCalendar size={12} />
                          <span>Issued {formatShortDate(redemption.created_at)}</span>
                        </div>
                        {redemption.redemptions?.redeemed_at && (
                          <div className="flex items-center gap-1">
                            <FiCheck size={12} />
                            <span>Redeemed {formatShortDate(redemption.redemptions.redeemed_at)}</span>
                          </div>
                        )}
                        {redemption.expires_at && status === 'valid' && !isExpired && (
                          <div className="flex items-center gap-1">
                            <FiClock size={12} />
                            <span>Expires {formatShortDate(redemption.expires_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}