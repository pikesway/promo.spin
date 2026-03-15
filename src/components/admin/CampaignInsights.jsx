import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiUsers, FiTrendingUp, FiGift, FiAward, FiCalendar, FiClock } from 'react-icons/fi';
import { supabase } from '../../supabase/client';

export default function CampaignInsights({ scopeType, scopeId, label }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchInsights = useCallback(async (force = false) => {
    if (!scopeId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compute-campaign-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ scopeType, scopeId, forceRefresh: force }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load insights');
      setInsights({ ...result.data, computedAt: result.computedAt, nextRefreshAt: result.nextRefreshAt });
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId]);

  useEffect(() => {
    fetchInsights(false);
  }, [fetchInsights]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-red-400 mb-3">{error}</p>
        <button
          onClick={() => fetchInsights(true)}
          className="btn btn-ghost text-sm"
        >
          <FiRefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {label || 'Insights'}
          </h3>
          {insights?.computedAt && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              <FiClock size={11} />
              Updated {formatDate(insights.computedAt)}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && !insights ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-primary)' }} />
        </div>
      ) : insights ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                <FiUsers size={14} />
                <span className="text-xs">Total Members</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{insights.totalMembers ?? '—'}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                <FiTrendingUp size={14} />
                <span className="text-xs">Avg Visits</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{insights.avgVisits != null ? Number(insights.avgVisits).toFixed(1) : '—'}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                <FiGift size={14} />
                <span className="text-xs">Redemption Rate</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{insights.redemptionRate != null ? `${Number(insights.redemptionRate).toFixed(1)}%` : '—'}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                <FiCalendar size={14} />
                <span className="text-xs">Birthday This Month</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{insights.birthdayRedeemedThisMonth ?? '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiAward size={14} style={{ color: 'var(--brand-primary)' }} />
                Top Loyal Members
              </h4>
              {insights.topMembers?.length > 0 ? (
                <div className="space-y-2">
                  {insights.topMembers.map((member, i) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#B45309' : 'var(--bg-tertiary)',
                          color: i < 3 ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                        {member.campaignName && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{member.campaignName}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--brand-primary)' }}>
                        {member.totalVisits} visits
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No data yet</p>
              )}
            </div>

            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiGift size={14} style={{ color: '#10B981' }} />
                Members Nearing Reward
              </h4>
              {insights.nearingReward?.length > 0 ? (
                <div className="space-y-2">
                  {insights.nearingReward.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                        {member.campaignName && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{member.campaignName}</p>
                        )}
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                      >
                        {member.stampsRemaining} away
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No members nearing reward</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
