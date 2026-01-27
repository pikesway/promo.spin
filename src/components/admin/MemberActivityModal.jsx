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
          className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">Member Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <FiUser className="text-rose-400" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">{member.name}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <FiMail size={14} />
                  <span className="truncate">{member.email}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {member.current_progress}/{threshold}
                </div>
                <div className="text-xs text-gray-500">Progress</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{member.total_visits || 0}</div>
                <div className="text-xs text-gray-500">Total Visits</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-amber-400">{redemptions.length}</div>
                <div className="text-xs text-gray-500">Rewards Earned</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-400">
                  {redemptions.filter(r => r.status === 'redeemed' || r.redemptions?.status === 'redeemed').length}
                </div>
                <div className="text-xs text-gray-500">Redeemed</div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
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

          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'text-white border-b-2 border-rose-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Activity Log
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'rewards'
                  ? 'text-white border-b-2 border-rose-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Rewards ({redemptions.length})
            </button>
          </div>

          <div className="overflow-y-auto max-h-[40vh] p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : activeTab === 'activity' ? (
              activityLog.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No activity recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {activityLog.map((log) => {
                    const config = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.visit_confirmed;
                    const Icon = config.icon;

                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50"
                      >
                        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
                          <Icon className={config.color} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{config.label}</p>
                          <p className="text-gray-500 text-xs">{formatDate(log.created_at)}</p>
                        </div>
                        {log.quantity > 1 && (
                          <span className="text-gray-400 text-sm">x{log.quantity}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : redemptions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No rewards earned yet</p>
            ) : (
              <div className="space-y-3">
                {redemptions.map((redemption) => {
                  const status = redemption.redemptions?.status || redemption.status;
                  const statusConfig = REDEMPTION_STATUS[status] || REDEMPTION_STATUS.valid;
                  const prizeName = redemption.redemptions?.prize_name || 'Reward';
                  const isExpired = redemption.expires_at && new Date(redemption.expires_at) < new Date() && status === 'valid';
                  const displayStatus = isExpired ? REDEMPTION_STATUS.expired : statusConfig;

                  return (
                    <div
                      key={redemption.id}
                      className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">{prizeName}</p>
                          <p className="text-gray-500 text-xs font-mono">{redemption.short_code}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${displayStatus.bg} ${displayStatus.color}`}>
                          {displayStatus.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
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
