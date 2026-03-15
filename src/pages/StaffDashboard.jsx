import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiUsers, FiGift, FiCheck, FiCalendar, FiLogOut, FiRefreshCw, FiTag, FiGrid, FiBarChart2 } from 'react-icons/fi';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';
import StaffValidationModal from '../components/loyalty/StaffValidationModal';
import ManagerOverrideModal from '../components/loyalty/ManagerOverrideModal';
import CampaignInsights from '../components/admin/CampaignInsights';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut, isStaff, isClientUser, canViewStats } = useAuth();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [brands, setBrands] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loyaltyMembers, setLoyaltyMembers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [actionType, setActionType] = useState('visit');
  const [activeView, setActiveView] = useState('members');
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

      let brandsQuery = supabase
        .from('brands')
        .select('*')
        .eq('client_id', profile.client_id)
        .eq('active', true);

      if (isClientUser && isClientUser()) {
        const { data: permData } = await supabase
          .from('user_brand_permissions')
          .select('brand_id')
          .eq('user_id', user?.id)
          .eq('active', true);

        if (permData && permData.length > 0) {
          const permittedBrandIds = permData.map(p => p.brand_id);
          brandsQuery = brandsQuery.in('id', permittedBrandIds);
        }
      }

      const { data: brandsData } = await brandsQuery;
      setBrands(brandsData || []);

      const brandIds = (brandsData || []).map(b => b.id);

      let campaignData = [];
      if (brandIds.length > 0) {
        const { data } = await supabase
          .from('campaigns')
          .select('*, loyalty_programs(*)')
          .in('brand_id', brandIds)
          .eq('type', 'loyalty');
        campaignData = data || [];
      }

      setCampaigns(campaignData);

      const campaignIds = campaignData.map(c => c.id);

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

        setStats({ todayConfirmations, pendingRewards, activeMembers });
      }
    } catch (err) {
      console.error('Error loading staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.client_id, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isStaff() && profile && !loading) {
      navigate('/');
    }
  }, [profile, isStaff, navigate, loading]);

  const visibleCampaigns = selectedBrandId === 'all'
    ? campaigns
    : campaigns.filter(c => c.brand_id === selectedBrandId);

  const filteredMembers = loyaltyMembers.filter(member => {
    const campaign = campaigns.find(c => c.id === member.campaign_id);
    const matchesBrand = selectedBrandId === 'all' || campaign?.brand_id === selectedBrandId;
    const matchesSearch = searchQuery === '' ||
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery) ||
      member.member_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCampaign = selectedCampaign === 'all' || member.campaign_id === selectedCampaign;
    return matchesBrand && matchesSearch && matchesCampaign;
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

  const getUnlockPin = () => {
    if (!selectedMember) return null;
    const campaign = campaigns.find(c => c.id === selectedMember.campaign_id);
    if (!campaign?.brand_id) return null;
    const brand = brands.find(b => b.id === campaign.brand_id);
    return brand?.unlock_pin || null;
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
          <button onClick={handleSignOut} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const validationConfig = getValidationConfig();
  const unlockPin = getUnlockPin();

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--bg-primary)' }}>
      <div className="container px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {client?.logo_url && (
              <img src={client.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{client?.name || 'Staff Dashboard'}</h1>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{profile?.full_name || profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isClientUser() && profile?.client_id && (
              <button
                onClick={() => navigate(`/client/${profile.client_id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <FiGrid size={14} />
                Campaign View
              </button>
            )}
            <button onClick={handleSignOut} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <FiLogOut size={20} />
            </button>
          </div>
        </div>

        {canViewStats('all') && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                <FiCheck size={14} />
                <span className="text-xs">Today</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.todayConfirmations}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                <FiGift size={14} />
                <span className="text-xs">Rewards</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.pendingRewards}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                <FiUsers size={14} />
                <span className="text-xs">Members</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.activeMembers}</p>
            </div>
          </div>
        )}

        {canViewStats('all') && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveView('members')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'members' ? 'text-white' : ''}`}
              style={{
                background: activeView === 'members' ? 'var(--brand-primary)' : 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                color: activeView === 'members' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <FiUsers size={13} />
              Members
            </button>
            <button
              onClick={() => setActiveView('insights')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeView === 'insights' ? 'var(--brand-primary)' : 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                color: activeView === 'insights' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <FiBarChart2 size={13} />
              Insights
            </button>
          </div>
        )}

        {activeView === 'insights' && canViewStats('all') ? (
          <CampaignInsights
            scopeType="client"
            scopeId={profile?.client_id}
            label="Program Insights"
          />
        ) : null}

        {(activeView === 'members' || !canViewStats('all')) && brands.length > 1 && (
          <div className="glass-card p-3 mb-4 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <FiTag size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <button
              onClick={() => { setSelectedBrandId('all'); setSelectedCampaign('all'); }}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${selectedBrandId === 'all' ? 'text-white' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}
              style={selectedBrandId === 'all' ? { background: 'var(--accent)' } : {}}
            >
              All Brands
            </button>
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => { setSelectedBrandId(brand.id); setSelectedCampaign('all'); }}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1.5 ${selectedBrandId === brand.id ? 'text-white' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}
                style={selectedBrandId === brand.id ? { background: brand.primary_color || 'var(--accent)' } : {}}
              >
                {brand.name}
              </button>
            ))}
          </div>
        )}

        {(activeView === 'members' || !canViewStats('all')) && <div className="glass-card p-4 mb-6">
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
            <button onClick={fetchData} className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10">
              <FiRefreshCw size={18} />
            </button>
          </div>

          {visibleCampaigns.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
              <button
                onClick={() => setSelectedCampaign('all')}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCampaign === 'all' ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                All Programs
              </button>
              {visibleCampaigns.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCampaign(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCampaign === c.id ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'No members found' : 'No loyalty members yet'}
              </p>
            ) : (
              filteredMembers.map(member => {
                const campaign = campaigns.find(c => c.id === member.campaign_id);
                const threshold = campaign?.loyalty_programs?.[0]?.threshold || campaign?.config?.loyalty?.threshold || 10;

                return (
                  <div key={member.id} className="p-3 rounded-xl transition-colors" style={{ background: 'var(--glass-bg)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                          {member.reward_unlocked && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)' }}>
                              Reward Ready
                            </span>
                          )}
                        </div>
                        <p className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>{member.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {member.current_progress}/{threshold} stamps
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
        </div>}

        {(activeView === 'members' || !canViewStats('all')) && recentActivity.length > 0 && (
          <div className="glass-card p-4">
            <h2 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
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
                  <span className="flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {activity.loyalty_accounts?.name || 'Member'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
        onLockout={() => {}}
        accountId={selectedMember?.id}
        campaignId={selectedMember?.campaign_id}
      />

      <ManagerOverrideModal
        isOpen={showManagerOverride}
        onClose={() => setShowManagerOverride(false)}
        onUnlock={async () => setShowManagerOverride(false)}
        memberName={selectedMember?.name}
        unlockPin={unlockPin}
      />
    </div>
  );
}
