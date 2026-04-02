import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase/client';

const PlatformContext = createContext();

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) throw new Error('usePlatform must be used within PlatformProvider');
  return context;
};

export const PlatformProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [brands, setBrands] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [impersonation, setImpersonation] = useState({ clientId: null, brandId: null });
  const loadedForSession = useRef(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const initData = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error in Platform:', error.message);
          return;
        }
        if (data?.session?.user) {
          loadedForSession.current = data.session.user.id;
          loadData();
        }
      } catch (err) {
        console.error('Platform initialization error:', err);
      }
    };

    initData();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && loadedForSession.current !== session.user.id) {
        loadedForSession.current = session.user.id;
        loadData();
      } else if (!session) {
        loadedForSession.current = null;
        setClients([]);
        setBrands([]);
        setCampaigns([]);
        setLeads([]);
        setRedemptions([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    if (!supabase || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const [clientsResult, brandsResult, campaignsResult, leadsResult, redemptionsResult] = await Promise.allSettled([
        supabase.from('clients').select('*').order('name'),
        supabase.from('brands').select('*').order('name'),
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('redemptions').select('*').order('generated_at', { ascending: false }).limit(200)
      ]);

      if (clientsResult.status === 'fulfilled' && !clientsResult.value.error) {
        setClients(clientsResult.value.data || []);
      }
      if (brandsResult.status === 'fulfilled' && !brandsResult.value.error) {
        setBrands(brandsResult.value.data || []);
      }
      if (campaignsResult.status === 'fulfilled' && !campaignsResult.value.error) {
        setCampaigns(campaignsResult.value.data || []);
      }
      if (leadsResult.status === 'fulfilled' && !leadsResult.value.error) {
        setLeads(leadsResult.value.data || []);
      }
      if (redemptionsResult.status === 'fulfilled' && !redemptionsResult.value.error) {
        setRedemptions(redemptionsResult.value.data || []);
      }
    } catch (err) {
      console.error('Error loading platform data:', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  };

  const refreshData = () => loadData();

  // ============================================================================
  // IMPERSONATION
  // ============================================================================

  const startImpersonation = useCallback(async (clientId, brandId = null) => {
    setImpersonation({ clientId, brandId });
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('audit_logs').insert({
            actor_user_id: session.user.id,
            impersonated_client_id: clientId,
            impersonated_brand_id: brandId,
            action_type: 'impersonation_start',
            entity_type: 'client',
            entity_id: clientId,
            metadata: { brand_id: brandId }
          });
        }
      } catch (err) {
        console.error('Failed to log impersonation start:', err);
      }
    }
  }, []);

  const stopImpersonation = useCallback(async () => {
    if (supabase && (impersonation.clientId || impersonation.brandId)) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('audit_logs').insert({
            actor_user_id: session.user.id,
            impersonated_client_id: impersonation.clientId,
            impersonated_brand_id: impersonation.brandId,
            action_type: 'impersonation_end',
            entity_type: 'client',
            entity_id: impersonation.clientId,
            metadata: {}
          });
        }
      } catch (err) {
        console.error('Failed to log impersonation end:', err);
      }
    }
    setImpersonation({ clientId: null, brandId: null });
  }, [impersonation]);

  const logAuditAction = useCallback(async (actionType, entityType, entityId, metadata = {}) => {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.from('audit_logs').insert({
        actor_user_id: session.user.id,
        impersonated_client_id: impersonation.clientId || null,
        impersonated_brand_id: impersonation.brandId || null,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        metadata
      });

      if (impersonation.clientId) {
        await supabase.from('client_notifications').insert({
          client_id: impersonation.clientId,
          title: `Admin action: ${actionType.replace(/_/g, ' ')}`,
          message: `A platform administrator made a change to your ${entityType} on your behalf.`
        });
      }
    } catch (err) {
      console.error('Failed to log audit action:', err);
    }
  }, [impersonation]);

  // ============================================================================
  // CLIENT CRUD
  // ============================================================================

  const createClient = async (clientData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();
      if (error) throw error;
      setClients(prev => [...prev, data]);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateClient = async (id, updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setClients(prev => prev.map(c => c.id === id ? data : c));
      await logAuditAction('client_updated', 'client', id, updates);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteClient = async (id) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      setBrands(prev => prev.filter(b => b.client_id !== id));
      setCampaigns(prev => prev.filter(c => c.client_id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // ============================================================================
  // BRAND CRUD
  // ============================================================================

  const createBrand = async (brandData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert(brandData)
        .select()
        .single();
      if (error) throw error;
      setBrands(prev => [...prev, data]);
      await logAuditAction('brand_created', 'brand', data.id, { name: data.name });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateBrand = async (id, updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('brands')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setBrands(prev => prev.map(b => b.id === id ? data : b));
      await logAuditAction('brand_updated', 'brand', id, updates);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteBrand = async (id) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    try {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
      setBrands(prev => prev.filter(b => b.id !== id));
      setCampaigns(prev => prev.filter(c => c.brand_id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // ============================================================================
  // CAMPAIGN CRUD
  // ============================================================================

  const createCampaign = async (campaignData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();
      if (error) throw error;
      setCampaigns(prev => [data, ...prev]);
      await logAuditAction('campaign_created', 'campaign', data.id, { name: data.name });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateCampaign = async (id, updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
      await logAuditAction('campaign_updated', 'campaign', id, updates);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteCampaign = async (id) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      setCampaigns(prev => prev.filter(c => c.id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const duplicateCampaign = async (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return { data: null, error: new Error('Campaign not found') };
    const { id, created_at, updated_at, slug, ...rest } = campaign;
    const newSlug = `${slug}-copy-${Date.now()}`;
    return createCampaign({ ...rest, slug: newSlug, status: 'draft', name: `${campaign.name} (Copy)` });
  };

  const toggleCampaignStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    return updateCampaign(id, { status: newStatus });
  };

  // ============================================================================
  // FILTER HELPERS
  // ============================================================================

  const getBrandsByClient = (clientId) => brands.filter(b => b.client_id === clientId);

  const getCampaignsByBrand = (brandId) => campaigns.filter(c => c.brand_id === brandId);

  const getCampaignsByClient = (clientId) => campaigns.filter(c => c.client_id === clientId);

  const getLeadsByBrand = (brandId) => leads.filter(l => l.brand_id === brandId);

  const getLeadsByClient = (clientId) => leads.filter(l => l.client_id === clientId);

  const getCampaignBySlug = (slug) => campaigns.find(c => c.slug === slug) || null;

  const getCampaignAnalytics = (campaignId) => {
    const campaignLeads = leads.filter(l => l.campaign_id === campaignId);
    const campaignRedemptions = redemptions.filter(r => r.campaign_id === campaignId);
    return {
      totalLeads: campaignLeads.length,
      totalRedemptions: campaignRedemptions.length,
      conversionRate: campaignLeads.length > 0
        ? Math.round((campaignRedemptions.length / campaignLeads.length) * 100)
        : 0,
    };
  };

  const getClientUsage = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return null;
    const clientBrands = brands.filter(b => b.client_id === clientId && b.active);
    const allClientBrands = brands.filter(b => b.client_id === clientId);
    const clientCampaigns = campaigns.filter(c => c.client_id === clientId && c.status === 'active');
    const clientLeads = leads.filter(l => l.client_id === clientId);

    const allocatedLoyaltyMembers = allClientBrands.reduce((sum, b) => sum + (b.loyalty_members_limit || 0), 0);
    const allocatedLeads = allClientBrands.reduce((sum, b) => sum + (b.leads_limit || 0), 0);

    return {
      activeBrands: clientBrands.length,
      activeBrandsLimit: client.active_brands_limit,
      activeCampaigns: clientCampaigns.length,
      activeCampaignsLimit: client.active_campaigns_limit,
      activeUsersLimit: client.active_users_limit,
      loyaltyMembersLimit: client.loyalty_members_limit,
      leadsLimit: client.leads_limit,
      allocatedLoyaltyMembers,
      remainingLoyaltyAllocation: (client.loyalty_members_limit || 0) - allocatedLoyaltyMembers,
      allocatedLeads,
      remainingLeadsAllocation: (client.leads_limit || 0) - allocatedLeads,
      totalLeads: clientLeads.length,
    };
  };

  const getBrandAllocationSummary = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return null;
    const clientBrands = brands.filter(b => b.client_id === clientId);
    const allocatedLoyalty = clientBrands.reduce((sum, b) => sum + (b.loyalty_members_limit || 0), 0);
    const allocatedLeads = clientBrands.reduce((sum, b) => sum + (b.leads_limit || 0), 0);
    return {
      loyaltyMembersLimit: client.loyalty_members_limit || 0,
      allocatedLoyalty,
      remainingLoyalty: (client.loyalty_members_limit || 0) - allocatedLoyalty,
      leadsLimit: client.leads_limit || 0,
      allocatedLeads,
      remainingLeads: (client.leads_limit || 0) - allocatedLeads,
    };
  };

  const getBrandMemberCount = async (brandId) => {
    if (!supabase) return 0;
    const { count } = await supabase
      .from('loyalty_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId);
    return count || 0;
  };

  // ============================================================================
  // GAME INSTANCE CRUD
  // ============================================================================

  const createGameInstance = async (instanceData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('campaign_game_instances')
        .insert({ ...instanceData, status: instanceData.status || 'draft' })
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('game_instance_created', 'game_instance', data.id, { name: data.name });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateGameInstance = async (id, updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('campaign_game_instances')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('game_instance_updated', 'game_instance', id, updates);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const archiveGameInstance = async (id) => {
    return updateGameInstance(id, { status: 'archived' });
  };

  const getGameInstancesByCampaign = async (campaignId) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('campaign_game_instances')
        .select('*')
        .eq('campaign_id', campaignId)
        .neq('status', 'archived')
        .order('sequence_number', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  // ============================================================================
  // TRIVIA REWARDS CRUD
  // ============================================================================

  const createTriviaReward = async (rewardData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('trivia_rewards')
        .insert(rewardData)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('trivia_reward_created', 'trivia_reward', data.id, { reward_name: data.reward_name });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateTriviaReward = async (id, updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('trivia_rewards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('trivia_reward_updated', 'trivia_reward', id, updates);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteTriviaReward = async (id) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    try {
      const { error } = await supabase.from('trivia_rewards').delete().eq('id', id);
      if (error) throw error;
      await logAuditAction('trivia_reward_deleted', 'trivia_reward', id, {});
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const getTriviaRewardsByCampaign = async (campaignId, scope = null) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    try {
      let query = supabase
        .from('trivia_rewards')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('rank_min', { ascending: true });

      if (scope) {
        query = query.eq('scope', scope);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  const getTriviaRewardsByInstance = async (instanceId) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('trivia_rewards')
        .select('*')
        .eq('instance_id', instanceId)
        .eq('scope', 'instance')
        .order('rank_min', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  // ============================================================================
  // TRIVIA FINALIZATION
  // ============================================================================

  const finalizeInstance = async (instanceId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase.rpc('finalize_game_instance', {
        p_instance_id: instanceId
      });
      if (error) throw error;
      await logAuditAction('game_instance_finalized', 'game_instance', instanceId, data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const finalizeCampaign = async (campaignId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase.rpc('finalize_trivia_campaign', {
        p_campaign_id: campaignId
      });
      if (error) throw error;
      await logAuditAction('campaign_finalized', 'campaign', campaignId, data);
      const updatedCampaign = campaigns.find(c => c.id === campaignId);
      if (updatedCampaign) {
        setCampaigns(prev => prev.map(c =>
          c.id === campaignId ? { ...c, finalized_at: new Date().toISOString() } : c
        ));
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // ============================================================================
  // LEADERBOARD QUERIES
  // ============================================================================

  const getInstanceLeaderboard = async (instanceId, limit = 100, offset = 0) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase.rpc('get_instance_leaderboard', {
        p_instance_id: instanceId,
        p_limit: limit,
        p_offset: offset
      });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  const getCampaignLeaderboard = async (campaignId, limit = 100, offset = 0) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase.rpc('get_campaign_leaderboard', {
        p_campaign_id: campaignId,
        p_limit: limit,
        p_offset: offset
      });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  // ============================================================================
  // REWARD ASSIGNMENTS
  // ============================================================================

  const getTriviaRewardAssignments = async (campaignId, instanceId = null) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    try {
      let query = supabase
        .from('trivia_reward_assignments')
        .select(`
          *,
          trivia_rewards (reward_name, reward_description, reward_value, fulfillment_method, scope),
          leads (data)
        `)
        .eq('campaign_id', campaignId)
        .order('rank_achieved', { ascending: true });

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  };

  const markRewardIssued = async (assignmentId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('trivia_reward_assignments')
        .update({
          status: 'issued',
          issued_at: new Date().toISOString(),
          issued_by: session?.user?.id || null
        })
        .eq('id', assignmentId)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('reward_issued', 'trivia_reward_assignment', assignmentId, {});
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const markRewardsIssuedBulk = async (assignmentIds) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('trivia_reward_assignments')
        .update({
          status: 'issued',
          issued_at: new Date().toISOString(),
          issued_by: session?.user?.id || null
        })
        .in('id', assignmentIds)
        .select();
      if (error) throw error;
      await logAuditAction('rewards_issued_bulk', 'trivia_reward_assignment', null, { count: assignmentIds.length });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const issuePlatformReward = async (assignmentId, redemptionId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('trivia_reward_assignments')
        .update({
          status: 'issued',
          issued_at: new Date().toISOString(),
          issued_by: session?.user?.id || null,
          redemption_id: redemptionId
        })
        .eq('id', assignmentId)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('platform_reward_issued', 'trivia_reward_assignment', assignmentId, { redemption_id: redemptionId });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const markRewardFulfilled = async (assignmentId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    try {
      const { data, error } = await supabase
        .from('trivia_reward_assignments')
        .update({
          status: 'fulfilled',
          fulfilled_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // ============================================================================
  // TRIVIA SHELL TEMPLATES
  // ============================================================================

  const fetchTriviaShells = async () => {
    try {
      const apiUrl = import.meta.env.VITE_TRIVIA_API_URL;
      if (!apiUrl) throw new Error("VITE_TRIVIA_API_URL is missing");

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.success && result.data) {
        return { data: result.data, error: null };
      } else {
        throw new Error(result.error || "Failed to fetch templates");
      }
    } catch (error) {
      console.warn("Using mock templates due to API failure:", error);
      return {
        data: [
          { id: 'mock-1', name: 'General Trivia V1', status: 'active' },
          { id: 'mock-2', name: 'Pop Culture 2026', status: 'active' }
        ],
        error: null
      };
    }
  };

  const value = {
    clients,
    brands,
    campaigns,
    leads,
    redemptions,
    isLoading,
    impersonation,
    startImpersonation,
    stopImpersonation,
    logAuditAction,
    refreshData,
    createClient,
    updateClient,
    deleteClient,
    createBrand,
    updateBrand,
    deleteBrand,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    duplicateCampaign,
    toggleCampaignStatus,
    getBrandsByClient,
    getCampaignsByBrand,
    getCampaignsByClient,
    getLeadsByBrand,
    getLeadsByClient,
    getCampaignBySlug,
    getCampaignAnalytics,
    getClientUsage,
    getBrandAllocationSummary,
    getBrandMemberCount,
    createGameInstance,
    updateGameInstance,
    archiveGameInstance,
    getGameInstancesByCampaign,
    createTriviaReward,
    updateTriviaReward,
    deleteTriviaReward,
    getTriviaRewardsByCampaign,
    getTriviaRewardsByInstance,
    finalizeInstance,
    finalizeCampaign,
    getInstanceLeaderboard,
    getCampaignLeaderboard,
    getTriviaRewardAssignments,
    markRewardIssued,
    markRewardsIssuedBulk,
    issuePlatformReward,
    markRewardFulfilled,
    fetchTriviaShells,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};
