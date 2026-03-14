import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/client';
import { uploadClientLogo as uploadLogoToStorage, deleteClientLogo } from '../utils/storageHelpers';
import { getDefaultColors } from '../utils/brandingHelpers';

const PlatformContext = createContext();

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) throw new Error('usePlatform must be used within PlatformProvider');
  return context;
};

export const PlatformProvider = ({ children }) => {
  const [agencies, setAgencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedForSession = useRef(null);

  useEffect(() => {
    const initData = async () => {
      if (!supabase) { 
        setIsLoading(false); 
        return; 
      }
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error in Platform:', error.message);
        }

        if (data?.session?.user) {
          loadedForSession.current = data.session.user.id;
          await loadData();
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Platform initialization error:', err);
        setIsLoading(false);
      }
    };
    
    initData();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && loadedForSession.current !== session.user.id) {
        loadedForSession.current = session.user.id;
        await loadData();
      } else if (!session) {
        loadedForSession.current = null;
        setAgencies([]);
        setClients([]);
        setCampaigns([]);
        setLeads([]);
        setRedemptions([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Load data sequentially to avoid race conditions and timeout issues
      const agenciesData = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
      setAgencies(agenciesData?.data || []);

      const clientsData = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      setClients(clientsData?.data || []);

      const campaignsData = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      setCampaigns(campaignsData?.data || []);

      const leadsData = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      setLeads(leadsData?.data || []);

      const redemptionsData = await supabase.from('redemptions').select('*').order('generated_at', { ascending: false });
      setRedemptions(redemptionsData?.data || []);
    } catch (error) {
      console.error('Error loading platform data:', error);
      // Set empty arrays on error to allow the app to continue
      setAgencies([]);
      setClients([]);
      setCampaigns([]);
      setLeads([]);
      setRedemptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createAgency = async (agencyData) => {
    if (!supabase) throw new Error('Supabase is not configured');
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
    if (!supabase) throw new Error('Supabase is not configured');
    let logoUrl = clientData.logoUrl || clientData.logo_url || null;
    if (clientData.logo_type === 'upload' && clientData.logo_file) {
      const uploadResult = await uploadLogoToStorage(clientData.logo_file, `temp-${Date.now()}`);
      if (uploadResult.error) throw new Error('Failed to upload logo');
      logoUrl = uploadResult.data.url;
    }
    const defaults = getDefaultColors();
    const newClient = {
      agency_id: clientData.agencyId || clientData.agency_id,
      name: clientData.name,
      email: clientData.email,
      logo_type: clientData.logo_type || 'url',
      logo_url: logoUrl,
      primary_color: clientData.primary_color || defaults.primary,
      secondary_color: clientData.secondary_color || defaults.secondary,
      background_color: clientData.background_color || defaults.background,
      status: clientData.status || 'prospect',
      status_notes: clientData.status_notes || null,
      settings: clientData.settings || {}
    };
    const { data, error } = await supabase.from('clients').insert(newClient).select().single();
    if (error) throw error;
    setClients(prev => [data, ...prev]);
    return data;
  };

  const updateClient = async (clientId, updates) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const cleanUpdates = { ...updates };
    if (cleanUpdates.logo_type === 'upload' && cleanUpdates.logo_file) {
      const client = clients.find(c => c.id === clientId);
      if (client?.logo_url && client?.logo_type === 'upload') await deleteClientLogo(client.logo_url);
      const uploadResult = await uploadLogoToStorage(cleanUpdates.logo_file, clientId);
      if (uploadResult.error) throw new Error('Failed to upload logo');
      cleanUpdates.logo_url = uploadResult.data.url;
    }
    delete cleanUpdates.logo_file;
    const { data, error } = await supabase.from('clients').update(cleanUpdates).eq('id', clientId).select().single();
    if (error) throw error;
    setClients(prev => prev.map(c => c.id === clientId ? data : c));
    return data;
  };

  const deleteClient = async (clientId) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  const updateClientStatus = async (clientId, status, notes) => {
    return updateClient(clientId, { status, status_notes: notes || null });
  };

  const uploadClientLogoFile = async (file, clientId) => {
    return uploadLogoToStorage(file, clientId);
  };

  const getClientBranding = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return null;
    return { logo_type: client.logo_type, logo_url: client.logo_url, primary_color: client.primary_color, secondary_color: client.secondary_color, background_color: client.background_color };
  };

  const createCampaign = async (campaignData) => {
    if (!supabase) throw new Error('Supabase is not configured');
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
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('campaigns').update(updates).eq('id', campaignId).select().single();
    if (error) throw error;
    setCampaigns(prev => prev.map(c => c.id === campaignId ? data : c));
    return data;
  };

  const deleteCampaign = async (campaignId) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
    if (error) throw error;
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
  };

  const duplicateCampaign = async (campaignId) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) throw new Error('Campaign not found');
    const existingSlugs = campaigns.map(c => c.slug);
    let newSlug = `${campaign.slug}-copy`;
    let counter = 1;
    while (existingSlugs.includes(newSlug)) { newSlug = `${campaign.slug}-copy-${counter}`; counter++; }
    const newCampaign = {
      client_id: campaign.client_id, name: `${campaign.name} (Copy)`, slug: newSlug,
      type: campaign.type, status: 'draft', start_date: null, end_date: null,
      config: { ...campaign.config }, analytics: {}
    };
    const { data, error } = await supabase.from('campaigns').insert(newCampaign).select().single();
    if (error) throw error;
    setCampaigns(prev => [data, ...prev]);
    return data;
  };

  const toggleCampaignStatus = async (campaignId, currentStatus) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const { data, error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaignId).select().single();
    if (error) throw error;
    setCampaigns(prev => prev.map(c => c.id === campaignId ? data : c));
    return data;
  };

  const getClientsByAgency = (agencyId) => clients.filter(c => c.agency_id === agencyId);
  const getCampaignsByClient = (clientId) => campaigns.filter(c => c.client_id === clientId);
  const getLeadsByClient = (clientId) => leads.filter(l => l.client_id === clientId);
  const getLeadsByCampaign = (campaignId) => leads.filter(l => l.campaign_id === campaignId);
  const getCampaignBySlug = (slug) => campaigns.find(c => c.slug === slug);

  const getCampaignAnalytics = (campaignId) => {
    const campaignLeads = leads.filter(l => l.campaign_id === campaignId);
    const campaign = campaigns.find(c => c.id === campaignId);
    const storedAnalytics = campaign?.analytics || {};
    return {
      views: storedAnalytics.views || 0,
      leads: campaignLeads.length,
      wins: storedAnalytics.wins || 0,
      totalPlays: storedAnalytics.views || 0,
      win_rate: 0
    };
  };

  const value = {
    agencies, clients, campaigns, leads, redemptions, isLoading,
    createAgency, createClient, updateClient, deleteClient,
    updateClientStatus, uploadClientLogoFile, getClientBranding,
    createCampaign, updateCampaign, deleteCampaign, duplicateCampaign, toggleCampaignStatus,
    getClientsByAgency, getCampaignsByClient, getLeadsByClient, getLeadsByCampaign,
    getCampaignBySlug, getCampaignAnalytics, refreshData: loadData
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};