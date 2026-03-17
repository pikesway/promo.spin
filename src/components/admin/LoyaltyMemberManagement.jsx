import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiDownload, FiRefreshCw, FiCheck, FiGift, FiUsers, FiTrash2, FiExternalLink, FiEye, FiChevronDown, FiFileText, FiList, FiCalendar } from 'react-icons/fi';
import { supabase } from '../../supabase/client';
import MemberActivityModal from './MemberActivityModal';

export default function LoyaltyMemberManagement({ clientId, campaigns }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [memberError, setMemberError] = useState(null);
  const exportMenuRef = useRef(null);
  const [birthdayEnabled, setBirthdayEnabled] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalVisits: 0,
    rewardsIssued: 0,
    rewardsRedeemed: 0,
    birthdayThisMonth: 0
  });

  const loyaltyCampaigns = (campaigns || []).filter(c => c.type === 'loyalty');
  const campaignIds = loyaltyCampaigns.map(c => c.id);

  const fetchMembers = useCallback(async () => {
    if (!clientId || campaignIds.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: memberData, error } = await supabase
        .from('loyalty_accounts')
        .select('*, campaigns(name), leads(name, email, phone, birthday)')
        .in('campaign_id', campaignIds)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setMembers(memberData || []);

      const totalMembers = (memberData || []).length;
      const totalVisits = (memberData || []).reduce((sum, m) => sum + (m.total_visits || 0), 0);

      const { data: progressData } = await supabase
        .from('loyalty_progress_log')
        .select('id')
        .in('campaign_id', campaignIds)
        .eq('action_type', 'reward_redeemed');

      const { data: redemptionData } = await supabase
        .from('loyalty_redemptions')
        .select('status')
        .in('campaign_id', campaignIds);

      const rewardsIssued = (progressData || []).length;
      const rewardsRedeemed = (redemptionData || []).filter(r => r.status === 'redeemed').length;

      const { data: loyaltyPrograms } = await supabase
        .from('loyalty_programs')
        .select('birthday_reward_enabled')
        .in('campaign_id', campaignIds);

      const anyBirthdayEnabled = (loyaltyPrograms || []).some(lp => lp.birthday_reward_enabled);
      setBirthdayEnabled(anyBirthdayEnabled);

      const currentMonth = new Date().getUTCMonth() + 1;
      const birthdayThisMonth = (memberData || []).filter(m => {
        if (!m.leads?.birthday) return false;
        const bd = new Date(m.leads.birthday);
        return (bd.getUTCMonth() + 1) === currentMonth;
      }).length;

      setStats({
        totalMembers,
        totalVisits,
        rewardsIssued,
        rewardsRedeemed,
        birthdayThisMonth
      });
    } catch (err) {
      console.error('Error fetching loyalty members:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, campaignIds.join(',')]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchQuery === '' ||
      member.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.leads?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.leads?.phone?.includes(searchQuery) ||
      member.member_code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCampaign = selectedCampaign === 'all' || member.campaign_id === selectedCampaign;

    return matchesSearch && matchesCampaign;
  });

  const handleResetProgress = async (member) => {
    if (!confirm(`Reset ${member.leads?.name}'s progress to 0 stamps?`)) return;

    try {
      await supabase
        .from('loyalty_accounts')
        .update({
          current_progress: 0,
          reward_unlocked: false,
          reward_unlocked_at: null
        })
        .eq('id', member.id);

      await supabase.from('loyalty_progress_log').insert({
        loyalty_account_id: member.id,
        campaign_id: member.campaign_id,
        action_type: 'progress_reset',
        quantity: 0
      });

      fetchMembers();
    } catch (err) {
      setMemberError('Failed to reset progress');
    }
  };

  const handleDeleteMember = async (member) => {
    if (!confirm(`Remove ${member.leads?.name} from this loyalty program? This cannot be undone.`)) return;

    try {
      await supabase
        .from('loyalty_accounts')
        .delete()
        .eq('id', member.id);

      fetchMembers();
    } catch (err) {
      setMemberError('Failed to remove member');
    }
  };

  const exportSummaryCSV = () => {
    if (filteredMembers.length === 0) {
      setMemberError('No members to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Program', 'Progress', 'Total Visits', 'Reward Status', 'Member Code', 'Enrolled'];
    const rows = filteredMembers.map(m => {
      const campaign = loyaltyCampaigns.find(c => c.id === m.campaign_id);
      const threshold = campaign?.config?.loyalty?.threshold || 10;
      return [
        m.leads?.name || '',
        m.leads?.email || '',
        m.leads?.phone || '',
        m.campaigns?.name || '',
        `${m.current_progress || 0}/${threshold}`,
        m.total_visits || 0,
        m.reward_unlocked ? 'Ready' : 'In Progress',
        m.member_code || '',
        new Date(m.enrolled_at).toLocaleDateString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loyalty-members-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportDetailedCSV = async () => {
    if (filteredMembers.length === 0) {
      setMemberError('No members to export');
      return;
    }

    setExporting(true);
    setShowExportMenu(false);

    try {
      const memberIds = filteredMembers.map(m => m.id);

      const { data: activityData } = await supabase
        .from('loyalty_progress_log')
        .select('*')
        .in('loyalty_account_id', memberIds)
        .order('created_at', { ascending: false });

      const { data: redemptionData } = await supabase
        .from('loyalty_redemptions')
        .select('*, redemptions(prize_name, status, redeemed_at)')
        .in('loyalty_account_id', memberIds)
        .order('created_at', { ascending: false });

      const activityByMember = {};
      const redemptionsByMember = {};

      (activityData || []).forEach(a => {
        if (!activityByMember[a.loyalty_account_id]) {
          activityByMember[a.loyalty_account_id] = [];
        }
        activityByMember[a.loyalty_account_id].push(a);
      });

      (redemptionData || []).forEach(r => {
        if (!redemptionsByMember[r.loyalty_account_id]) {
          redemptionsByMember[r.loyalty_account_id] = [];
        }
        redemptionsByMember[r.loyalty_account_id].push(r);
      });

      const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString();
      };

      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
      };

      const headers = [
        'Name', 'Email', 'Phone', 'Program', 'Member Code', 'Enrolled Date',
        'Current Progress', 'Threshold', 'Total Visits', 'Reward Ready',
        'Activity Date', 'Activity Type', 'Activity Quantity',
        'Reward Name', 'Coupon Code', 'Reward Status', 'Issued Date', 'Expires Date', 'Redeemed Date'
      ];

      const rows = [];

      filteredMembers.forEach(m => {
        const campaign = loyaltyCampaigns.find(c => c.id === m.campaign_id);
        const threshold = campaign?.config?.loyalty?.threshold || 10;
        const rewardName = campaign?.config?.loyalty?.reward_name || campaign?.config?.loyalty?.rewardName || 'Reward';
        const memberActivity = activityByMember[m.id] || [];
        const memberRedemptions = redemptionsByMember[m.id] || [];

        const maxRows = Math.max(1, memberActivity.length, memberRedemptions.length);

        for (let i = 0; i < maxRows; i++) {
          const activity = memberActivity[i];
          const redemption = memberRedemptions[i];

          let redemptionStatus = redemption?.redemptions?.status || redemption?.status || '';
          if (redemption?.expires_at && new Date(redemption.expires_at) < new Date() && redemptionStatus === 'valid') {
            redemptionStatus = 'expired';
          }

          rows.push([
            i === 0 ? (m.leads?.name || '') : '',
            i === 0 ? (m.leads?.email || '') : '',
            i === 0 ? (m.leads?.phone || '') : '',
            i === 0 ? (m.campaigns?.name || '') : '',
            i === 0 ? (m.member_code || '') : '',
            i === 0 ? formatDate(m.enrolled_at) : '',
            i === 0 ? (m.current_progress || 0) : '',
            i === 0 ? threshold : '',
            i === 0 ? (m.total_visits || 0) : '',
            i === 0 ? (m.reward_unlocked ? 'Yes' : 'No') : '',
            activity ? formatDateTime(activity.created_at) : '',
            activity ? activity.action_type : '',
            activity?.quantity > 1 ? activity.quantity : (activity ? '1' : ''),
            redemption ? (redemption.redemptions?.prize_name || rewardName) : '',
            redemption ? (redemption.short_code || '') : '',
            redemptionStatus,
            redemption ? formatDate(redemption.created_at) : '',
            redemption ? formatDate(redemption.expires_at) : '',
            redemption?.redemptions?.redeemed_at ? formatDate(redemption.redemptions.redeemed_at) : ''
          ]);
        }
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loyalty-members-detailed-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMemberError('Failed to export detailed data');
    } finally {
      setExporting(false);
    }
  };

  const openMemberCard = (member) => {
    const campaign = loyaltyCampaigns.find(c => c.id === member.campaign_id);
    if (campaign) {
      window.open(`${window.location.origin}/loyalty/${campaign.slug}/${member.member_code}`, '_blank');
    }
  };

  const openMemberDetail = (member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
  };

  if (loyaltyCampaigns.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <FiUsers className="mx-auto mb-4" size={40} style={{ color: 'var(--text-tertiary)' }} />
        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No Loyalty Programs Yet</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Create a Loyalty Program campaign to start managing members.
        </p>
      </div>
    );
  }

  return (
    <div>
      {memberError && (
        <div className="mb-4 p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--error-bg)', border: '1px solid var(--error)', color: 'var(--error)' }}>
          <span className="text-sm">{memberError}</span>
          <button onClick={() => setMemberError(null)} className="ml-3 text-sm font-medium opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Loyalty Members</h3>
        <div className="relative" ref={exportMenuRef}>
          <button
            className="btn btn-success btn-sm md:btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={filteredMembers.length === 0 || exporting}
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiDownload />
            )}
            <span className="hidden md:inline">{exporting ? 'Exporting...' : 'Export'}</span>
            <FiChevronDown className="ml-1" size={14} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-10 min-w-[180px] py-1" style={{ background: 'var(--modal-bg)', border: '1px solid var(--border-color)' }}>
              <button
                onClick={exportSummaryCSV}
                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--btn-ghost-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <FiFileText size={16} style={{ color: 'var(--text-tertiary)' }} />
                <div>
                  <div className="font-medium">Summary Export</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Basic member info</div>
                </div>
              </button>
              <button
                onClick={exportDetailedCSV}
                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--btn-ghost-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <FiList size={16} style={{ color: 'var(--text-tertiary)' }} />
                <div>
                  <div className="font-medium">Detailed Export</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Activity & rewards history</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-2 ${birthdayEnabled ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 mb-4`}>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            <FiUsers size={12} />
            Members
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalMembers}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            <FiCheck size={12} />
            Total Visits
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalVisits}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            <FiGift size={12} />
            Rewards Issued
          </div>
          <p className="text-xl font-bold" style={{ color: '#FBBF24' }}>{stats.rewardsIssued}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            <FiGift size={12} />
            Redeemed
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{stats.rewardsRedeemed}</p>
        </div>
        {birthdayEnabled && (
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              <FiCalendar size={12} />
              Birthdays
            </div>
            <p className="text-xl font-bold" style={{ color: '#EC4899' }}>{stats.birthdayThisMonth}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>this month</p>
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="input w-full pl-10"
            />
          </div>
          <button
            onClick={fetchMembers}
            className="p-2.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            <FiRefreshCw size={18} />
          </button>
        </div>

        {loyaltyCampaigns.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
            <button
              onClick={() => setSelectedCampaign('all')}
              className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
              style={{
                background: selectedCampaign === 'all' ? '#F43F5E' : 'var(--bg-tertiary)',
                color: selectedCampaign === 'all' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              All Programs
            </button>
            {loyaltyCampaigns.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCampaign(c.id)}
                className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
                style={{
                  background: selectedCampaign === c.id ? '#F43F5E' : 'var(--bg-tertiary)',
                  color: selectedCampaign === c.id ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--brand-primary)' }} />
          </div>
        ) : filteredMembers.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            {searchQuery ? 'No members found' : 'No loyalty members yet'}
          </p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Member</th>
                    <th className="text-left p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Program</th>
                    <th className="text-left p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Progress</th>
                    <th className="text-left p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    {birthdayEnabled && <th className="text-left p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Birthday</th>}
                    <th className="text-left p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Enrolled</th>
                    <th className="text-right p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(member => {
                    const campaign = loyaltyCampaigns.find(c => c.id === member.campaign_id);
                    const threshold = campaign?.config?.loyalty?.threshold || 10;

                    return (
                      <tr key={member.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="p-3">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.leads?.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{member.leads?.email}</p>
                        </td>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{member.campaigns?.name}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min((member.current_progress / threshold) * 100, 100)}%`, background: '#F43F5E' }}
                              />
                            </div>
                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{member.current_progress}/{threshold}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {member.reward_unlocked ? (
                            <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#FBBF24' }}>
                              Reward Ready
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>In Progress</span>
                          )}
                        </td>
                        {birthdayEnabled && (
                          <td className="p-3">
                            {member.leads?.birthday ? (() => {
                              const bd = new Date(member.leads.birthday);
                              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                              const isThisMonth = (bd.getUTCMonth() + 1) === (new Date().getUTCMonth() + 1);
                              return (
                                <span
                                  className="text-xs"
                                  style={{ color: isThisMonth ? '#EC4899' : 'var(--text-secondary)', fontWeight: isThisMonth ? '600' : 'normal' }}
                                >
                                  {months[bd.getUTCMonth()]} {bd.getUTCDate()}{isThisMonth ? ' 🎂' : ''}
                                </span>
                              );
                            })() : (
                              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                        )}
                        <td className="p-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(member.enrolled_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openMemberDetail(member)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                              title="View Activity"
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              onClick={() => openMemberCard(member)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                              title="View Card"
                            >
                              <FiExternalLink size={14} />
                            </button>
                            <button
                              onClick={() => handleResetProgress(member)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                              title="Reset Progress"
                            >
                              <FiRefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                              title="Remove Member"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {filteredMembers.map(member => {
                const campaign = loyaltyCampaigns.find(c => c.id === member.campaign_id);
                const threshold = campaign?.config?.loyalty?.threshold || 10;

                return (
                  <div key={member.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.leads?.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{member.leads?.email}</p>
                      </div>
                      {member.reward_unlocked && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#FBBF24' }}>
                          Reward
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min((member.current_progress / threshold) * 100, 100)}%`, background: '#F43F5E' }}
                        />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{member.current_progress}/{threshold}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{member.campaigns?.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openMemberDetail(member)}
                          className="p-1.5 rounded"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => openMemberCard(member)}
                          className="p-1.5 rounded"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <FiExternalLink size={14} />
                        </button>
                        <button
                          onClick={() => handleResetProgress(member)}
                          className="p-1.5 rounded"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <FiRefreshCw size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <MemberActivityModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        campaign={selectedMember ? loyaltyCampaigns.find(c => c.id === selectedMember.campaign_id) : null}
      />
    </div>
  );
}