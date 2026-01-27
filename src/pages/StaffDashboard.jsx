import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiUsers, FiGift, FiCheck, FiCalendar, FiLogOut, FiRefreshCw, FiChevronRight } from 'react-icons/fi';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';
import StaffValidationModal from '../components/loyalty/StaffValidationModal';
import ManagerOverrideModal from '../components/loyalty/ManagerOverrideModal';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut, isStaff } = useAuth();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loyaltyMembers, setLoyaltyMembers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [actionType, setActionType] = useState('visit');
  const [stats, setStats] = useState({
    todayConfirmations: 0,
    pendingRewards: 0,
    activeMembers: 0
  });

  const fetchData = useCallback(async () => {
    if (!profile?.client_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', profile.client_id)
        .maybeSingle();

      setClient(clientData);

      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*, loyalty_programs(*)')
        .eq('client_id', profile.client_id)
        .eq('type', 'loyalty');

      setCampaigns(campaignData || []);

      const campaignIds = (campaignData || []).map(c => c.id);

      if (campaignIds.length > 0) {
        const { data: memberData } = await supabase
          .from('loyalty_accounts')
          .select('*, campaigns(name)')
          .in('campaign_id', campaignIds)
          .order('updated_at', { ascending: false })
          .limit(100);

        setLoyaltyMembers(memberData || []);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: activityData } = await supabase
          .from('loyalty_progress_log')
          .select('*, loyalty_accounts(name, email)')
          .in('campaign_id', campaignIds)
          .order('created_at', { ascending: false })
          .limit(20);

        setRecentActivity(activityData || []);

        const todayConfirmations = (activityData || []).filter(a => {
          const activityDate = new Date(a.created_at);
          return activityDate >= today && a.action_type === 'visit_confirmed';
        }).length;

        const pendingRewards = (memberData || []).filter(m => m.reward_unlocked).length;
        const activeMembers = (memberData || []).length;

        setStats({
          todayConfirmations,
          pendingRewards,
          activeMembers
        });
      }
    } catch (err) {
      console.error('Error loading staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.client_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isStaff() && profile && !loading) {
      navigate('/');
    }
  }, [profile, isStaff, navigate, loading]);

  const filteredMembers = loyaltyMembers.filter(member => {
    const matchesSearch = searchQuery === '' ||
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery) ||
      member.member_code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCampaign = selectedCampaign === 'all' || member.campaign_id === selectedCampaign;

    return matchesSearch && matchesCampaign;
  });

  const handleMemberAction = (member, type) => {
    setSelectedMember(member);
    setActionType(type);
    setShowValidation(true);
  };

  const getValidationConfig = () => {
    if (!selectedMember) return { method: 'pin', config: {} };

    const campaign = campaigns.find(c => c.id === selectedMember.campaign_id);
    const loyaltyProgram = campaign?.loyalty_programs?.[0];
    const loyaltyConfig = loyaltyProgram || campaign?.config?.loyalty || {};

    return {
      method: loyaltyConfig.validation_method || loyaltyConfig.validationMethod || 'pin',
      config: loyaltyConfig.validation_config || loyaltyConfig.validationConfig || {},
      lockoutThreshold: loyaltyConfig.lockout_threshold || loyaltyConfig.lockoutThreshold || 3
    };
  };

  const handleValidationSuccess = async () => {
    setShowValidation(false);

    if (!selectedMember) return;

    try {
      const campaign = campaigns.find(c => c.id === selectedMember.campaign_id);
      const loyaltyProgram = campaign?.loyalty_programs?.[0];
      const threshold = loyaltyProgram?.threshold || campaign?.config?.loyalty?.threshold || 10;

      if (actionType === 'visit') {
        const newProgress = (selectedMember.current_progress || 0) + 1;
        const rewardUnlocked = newProgress >= threshold;

        await supabase
          .from('loyalty_accounts')
          .update({
            current_progress: newProgress,
            total_visits: (selectedMember.total_visits || 0) + 1,
            reward_unlocked: rewardUnlocked,
            reward_unlocked_at: rewardUnlocked ? new Date().toISOString() : null
          })
          .eq('id', selectedMember.id);

        await supabase.from('loyalty_progress_log').insert({
          loyalty_account_id: selectedMember.id,
          campaign_id: selectedMember.campaign_id,
          action_type: rewardUnlocked ? 'reward_unlocked' : 'visit_confirmed',
          quantity: 1,
          validated_by: user?.id
        });
      } else if (actionType === 'redemption') {
        const shortCode = generateShortCode();
        const resetBehavior = loyaltyProgram?.reset_behavior || campaign?.config?.loyalty?.resetBehavior || 'reset';
        const expiryDays = campaign?.config?.screens?.redemption?.expiryDays || 30;

        const newProgress = resetBehavior === 'rollover'
          ? (selectedMember.current_progress || 0) - threshold
          : 0;

        await supabase.from('loyalty_redemptions').insert({
          loyalty_account_id: selectedMember.id,
          campaign_id: selectedMember.campaign_id,
          short_code: shortCode,
          status: 'redeemed',
          redeemed_at: new Date().toISOString(),
          redeemed_by: user?.id,
          expires_at: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        });

        await supabase
          .from('loyalty_accounts')
          .update({
            current_progress: Math.max(0, newProgress),
            reward_unlocked: false,
            reward_unlocked_at: null
          })
          .eq('id', selectedMember.id);

        await supabase.from('loyalty_progress_log').insert({
          loyalty_account_id: selectedMember.id,
          campaign_id: selectedMember.campaign_id,
          action_type: 'reward_redeemed',
          quantity: 1,
          validated_by: user?.id
        });
      }

      fetchData();
      setSelectedMember(null);
    } catch (err) {
      console.error('Error processing action:', err);
      alert('Failed to process action');
    }
  };

  const generateShortCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.client_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-gray-400 mb-4">Your account is not associated with a client.</p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const validationConfig = getValidationConfig();

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--bg-primary)' }}>
      <div className="container px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {client?.logo_url && (
              <img
                src={client.logo_url}
                alt=""
                className="w-10 h-10 rounded-lg object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{client?.name || 'Staff Dashboard'}</h1>
              <p className="text-sm text-gray-500">{profile?.full_name || profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiLogOut size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <FiCheck size={14} />
              <span className="text-xs">Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.todayConfirmations}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <FiGift size={14} />
              <span className="text-xs">Rewards</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.pendingRewards}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <FiUsers size={14} />
              <span className="text-xs">Members</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.activeMembers}</p>
          </div>
        </div>

        <div className="glass-card p-4 mb-6">
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
              onClick={fetchData}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
            >
              <FiRefreshCw size={18} />
            </button>
          </div>

          {campaigns.length > 1 && (
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
              {campaigns.map(c => (
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

          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchQuery ? 'No members found' : 'No loyalty members yet'}
              </p>
            ) : (
              filteredMembers.map(member => {
                const campaign = campaigns.find(c => c.id === member.campaign_id);
                const threshold = campaign?.loyalty_programs?.[0]?.threshold || campaign?.config?.loyalty?.threshold || 10;

                return (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{member.name}</p>
                          {member.reward_unlocked && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                              Reward Ready
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm truncate">{member.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-400">
                            {member.current_progress}/{threshold} stamps
                          </span>
                          <span className="text-xs text-gray-500">
                            {member.campaigns?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {member.reward_unlocked ? (
                          <button
                            onClick={() => handleMemberAction(member, 'redemption')}
                            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <FiGift size={14} />
                            Redeem
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMemberAction(member, 'visit')}
                            className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <FiCheck size={14} />
                            Stamp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {recentActivity.length > 0 && (
          <div className="glass-card p-4">
            <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <FiCalendar size={14} />
              Recent Activity
            </h2>
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.action_type === 'reward_redeemed' ? 'bg-amber-500' :
                    activity.action_type === 'reward_unlocked' ? 'bg-green-500' :
                    'bg-rose-500'
                  }`} />
                  <span className="text-gray-400 flex-1 truncate">
                    {activity.loyalty_accounts?.name || 'Member'}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {activity.action_type === 'visit_confirmed' ? 'Stamped' :
                     activity.action_type === 'reward_unlocked' ? 'Earned reward' :
                     activity.action_type === 'reward_redeemed' ? 'Redeemed' : activity.action_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <StaffValidationModal
        isOpen={showValidation}
        onClose={() => {
          setShowValidation(false);
          setSelectedMember(null);
        }}
        onSuccess={handleValidationSuccess}
        validationMethod={validationConfig.method}
        validationConfig={validationConfig.config}
        actionType={actionType}
        lockoutThreshold={validationConfig.lockoutThreshold}
        isLocked={false}
        onUnlockRequest={() => {
          setShowValidation(false);
          setShowManagerOverride(true);
        }}
      />

      <ManagerOverrideModal
        isOpen={showManagerOverride}
        onClose={() => setShowManagerOverride(false)}
        onUnlock={async () => setShowManagerOverride(false)}
        memberName={selectedMember?.name}
        unlockPin={client?.unlock_pin}
      />
    </div>
  );
}
