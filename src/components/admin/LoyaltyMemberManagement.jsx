import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiDownload, FiRefreshCw, FiCheck, FiGift, FiUsers, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { supabase } from '../../supabase/client';

export default function LoyaltyMemberManagement({ clientId, campaigns }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalVisits: 0,
    rewardsIssued: 0,
    rewardsRedeemed: 0
  });

  const loyaltyCampaigns = (campaigns || []).filter(c => c.type === 'loyalty');

  const fetchMembers = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);

      const campaignIds = loyaltyCampaigns.map(c => c.id);
      if (campaignIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: memberData, error } = await supabase
        .from('loyalty_accounts')
        .select('*, campaigns(name)')
        .in('campaign_id', campaignIds)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setMembers(memberData || []);

      const totalMembers = (memberData || []).length;
      const totalVisits = (memberData || []).reduce((sum, m) => sum + (m.total_visits || 0), 0);

      const { data: redemptionData } = await supabase
        .from('loyalty_redemptions')
        .select('status')
        .in('campaign_id', campaignIds);

      const rewardsIssued = (redemptionData || []).length;
      const rewardsRedeemed = (redemptionData || []).filter(r => r.status === 'redeemed').length;

      setStats({
        totalMembers,
        totalVisits,
        rewardsIssued,
        rewardsRedeemed
      });
    } catch (err) {
      console.error('Error fetching loyalty members:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, loyaltyCampaigns]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchQuery === '' ||
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery) ||
      member.member_code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCampaign = selectedCampaign === 'all' || member.campaign_id === selectedCampaign;

    return matchesSearch && matchesCampaign;
  });

  const handleResetProgress = async (member) => {
    if (!confirm(`Reset ${member.name}'s progress to 0 stamps?`)) return;

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
      console.error('Error resetting progress:', err);
      alert('Failed to reset progress');
    }
  };

  const handleDeleteMember = async (member) => {
    if (!confirm(`Remove ${member.name} from this loyalty program? This cannot be undone.`)) return;

    try {
      await supabase
        .from('loyalty_accounts')
        .delete()
        .eq('id', member.id);

      fetchMembers();
    } catch (err) {
      console.error('Error deleting member:', err);
      alert('Failed to remove member');
    }
  };

  const exportToCSV = () => {
    if (filteredMembers.length === 0) {
      alert('No members to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Program', 'Progress', 'Total Visits', 'Reward Status', 'Member Code', 'Enrolled'];
    const rows = filteredMembers.map(m => {
      const campaign = loyaltyCampaigns.find(c => c.id === m.campaign_id);
      const threshold = campaign?.config?.loyalty?.threshold || 10;
      return [
        m.name || '',
        m.email || '',
        m.phone || '',
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
    a.download = `loyalty-members-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openMemberCard = (member) => {
    const campaign = loyaltyCampaigns.find(c => c.id === member.campaign_id);
    if (campaign) {
      window.open(`${window.location.origin}${window.location.pathname}#/loyalty/${campaign.slug}/${member.member_code}`, '_blank');
    }
  };

  if (loyaltyCampaigns.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <FiUsers className="mx-auto text-gray-500 mb-4" size={40} />
        <h3 className="text-lg font-medium text-white mb-2">No Loyalty Programs Yet</h3>
        <p className="text-gray-400">
          Create a Loyalty Program campaign to start managing members.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg md:text-xl font-semibold text-white">Loyalty Members</h3>
        <button
          className="btn btn-success btn-sm md:btn"
          onClick={exportToCSV}
          disabled={filteredMembers.length === 0}
        >
          <FiDownload /> <span className="hidden md:inline">Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <FiUsers size={12} />
            Members
          </div>
          <p className="text-xl font-bold text-white">{stats.totalMembers}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <FiCheck size={12} />
            Total Visits
          </div>
          <p className="text-xl font-bold text-white">{stats.totalVisits}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <FiGift size={12} />
            Rewards Issued
          </div>
          <p className="text-xl font-bold text-amber-400">{stats.rewardsIssued}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <FiGift size={12} />
            Redeemed
          </div>
          <p className="text-xl font-bold text-green-400">{stats.rewardsRedeemed}</p>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
            />
          </div>
          <button
            onClick={fetchMembers}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
          >
            <FiRefreshCw size={18} />
          </button>
        </div>

        {loyaltyCampaigns.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
            <button
              onClick={() => setSelectedCampaign('all')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCampaign === 'all'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All Programs
            </button>
            {loyaltyCampaigns.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCampaign(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCampaign === c.id
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {searchQuery ? 'No members found' : 'No loyalty members yet'}
          </p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-gray-400 font-medium">Member</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Program</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Progress</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Enrolled</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(member => {
                    const campaign = loyaltyCampaigns.find(c => c.id === member.campaign_id);
                    const threshold = campaign?.config?.loyalty?.threshold || 10;

                    return (
                      <tr key={member.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3">
                          <p className="text-white font-medium">{member.name}</p>
                          <p className="text-gray-500 text-xs">{member.email}</p>
                        </td>
                        <td className="p-3 text-gray-400">{member.campaigns?.name}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${Math.min((member.current_progress / threshold) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-white text-xs">{member.current_progress}/{threshold}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {member.reward_unlocked ? (
                            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                              Reward Ready
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">In Progress</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-400 text-xs">
                          {new Date(member.enrolled_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openMemberCard(member)}
                              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                              title="View Card"
                            >
                              <FiExternalLink size={14} />
                            </button>
                            <button
                              onClick={() => handleResetProgress(member)}
                              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-amber-400"
                              title="Reset Progress"
                            >
                              <FiRefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member)}
                              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400"
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
                  <div key={member.id} className="p-3 rounded-xl bg-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-medium">{member.name}</p>
                        <p className="text-gray-500 text-xs">{member.email}</p>
                      </div>
                      {member.reward_unlocked && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                          Reward
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${Math.min((member.current_progress / threshold) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-xs">{member.current_progress}/{threshold}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">{member.campaigns?.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openMemberCard(member)}
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400"
                        >
                          <FiExternalLink size={14} />
                        </button>
                        <button
                          onClick={() => handleResetProgress(member)}
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400"
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
    </div>
  );
}
