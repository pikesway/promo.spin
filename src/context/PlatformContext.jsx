import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

const PlatformContext = createContext();

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within PlatformProvider');
  }
  return context;
};

export const PlatformProvider = ({ children }) => {
  const [agencies, setAgencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agenciesData, clientsData, campaignsData, leadsData, redemptionsData] = await Promise.all([
        supabase.from('agencies').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('redemptions').select('*').order('generated_at', { ascending: false })
      ]);

      if (agenciesData.data) setAgencies(agenciesData.data);
      if (clientsData.data) setClients(clientsData.data);
      if (campaignsData.data) setCampaigns(campaignsData.data);
      if (leadsData.data) setLeads(leadsData.data);
      if (redemptionsData.data) setRedemptions(redemptionsData.data);
    } catch (error) {
      console.error('Error loading platform data:', error);
    }
    setIsLoading(false);
  };

  const createAgency = async (agencyData) => {
    const newAgency = {
      name: agencyData.name,
      email: agencyData.email,
      subdomain: agencyData.subdomain || agencyData.name.toLowerCase().replace(/\s+/g, '-'),
      settings: agencyData.settings || {},
      status: 'active'
    };

    const { data, error } = await supabase.from('agencies').insert(newAgency).select().single();
    if (error) throw error;

    setAgencies(prev => [data, ...prev]);
    return data;
  };

  const createClient = async (clientData) => {
    const newClient = {
      agency_id: clientData.agencyId,
      name: clientData.name,
      email: clientData.email,
      logo_url: clientData.logoUrl || null,
      settings: clientData.settings || {},
      status: 'active'
    };

    const { data, error } = await supabase.from('clients').insert(newClient).select().single();
    if (error) throw error;

    setClients(prev => [data, ...prev]);
    return data;
  };

  const updateClient = async (clientId, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;

    setClients(prev => prev.map(c => c.id === clientId ? data : c));
    return data;
  };

  const deleteClient = async (clientId) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  const createCampaign = async (campaignData) => {
    const slug = campaignData.slug || `${campaignData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const newCampaign = {
      client_id: campaignData.clientId,
      name: campaignData.name,
      slug,
      type: campaignData.type,
      status: campaignData.status || 'draft',
      start_date: campaignData.startDate || null,
      end_date: campaignData.endDate || null,
      config: campaignData.config || {},
      analytics: {}
    };

    const { data, error } = await supabase.from('campaigns').insert(newCampaign).select().single();
    if (error) throw error;

    setCampaigns(prev => [data, ...prev]);
    return data;
  };

  const updateCampaign = async (campaignId, updates) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;

    setCampaigns(prev => prev.map(c => c.id === campaignId ? data : c));
    return data;
  };

  const deleteCampaign = async (campaignId) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
    if (error) throw error;
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
  };

  const createLead = async (leadData) => {
    const newLead = {
      campaign_id: leadData.campaignId,
      client_id: leadData.clientId,
      data: leadData.data || {},
      metadata: {
        userAgent: navigator.userAgent,
        deviceType: window.innerWidth > 768 ? 'desktop' : 'mobile',
        ...leadData.metadata
      }
    };

    const { data, error } = await supabase.from('leads').insert(newLead).select().single();
    if (error) throw error;

    setLeads(prev => [data, ...prev]);
    return data;
  };

  const createRedemption = async (redemptionData) => {
    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newRedemption = {
      campaign_id: redemptionData.campaignId,
      client_id: redemptionData.clientId,
      lead_id: redemptionData.leadId || null,
      prize_name: redemptionData.prizeName,
      short_code: shortCode,
      status: 'valid',
      expires_at: redemptionData.expiresAt || null,
      metadata: redemptionData.metadata || {}
    };

    const { data, error } = await supabase.from('redemptions').insert(newRedemption).select().single();
    if (error) throw error;

    setRedemptions(prev => [data, ...prev]);
    return data;
  };

  const redeemCode = async (redemptionId, redeemedBy = 'staff') => {
    const { data, error } = await supabase
      .from('redemptions')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        redeemed_by: redeemedBy
      })
      .eq('id', redemptionId)
      .eq('status', 'valid')
      .select()
      .single();

    if (error) throw error;

    setRedemptions(prev => prev.map(r => r.id === redemptionId ? data : r));
    return data;
  };

  const getClientsByAgency = (agencyId) => {
    return clients.filter(c => c.agency_id === agencyId);
  };

  const getCampaignsByClient = (clientId) => {
    return campaigns.filter(c => c.client_id === clientId);
  };

  const getLeadsByClient = (clientId) => {
    return leads.filter(l => l.client_id === clientId);
  };

  const getLeadsByCampaign = (campaignId) => {
    return leads.filter(l => l.campaign_id === campaignId);
  };

  const getRedemptionsByClient = (clientId) => {
    return redemptions.filter(r => r.client_id === clientId);
  };

  const getCampaignBySlug = (slug) => {
    return campaigns.find(c => c.slug === slug);
  };

  const value = {
    agencies,
    clients,
    campaigns,
    leads,
    redemptions,
    isLoading,
    createAgency,
    createClient,
    updateClient,
    deleteClient,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createLead,
    createRedemption,
    redeemCode,
    getClientsByAgency,
    getCampaignsByClient,
    getLeadsByClient,
    getLeadsByCampaign,
    getRedemptionsByClient,
    getCampaignBySlug,
    refreshData: loadData
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};