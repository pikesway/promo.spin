import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

const LeadContext = createContext();

export const useLead = () => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLead must be used within a LeadProvider');
  }
  return context;
};

export const LeadProvider = ({ children }) => {
  const [leads, setLeads] = useState([]);

  // Load leads
  useEffect(() => {
    const loadLeads = async () => {
      if (supabase) {
        const { data } = await supabase.from('leads').select('*');
        if (data) {
          const formattedLeads = data.map(row => ({
            ...row.data,
            id: row.id,
            campaignId: row.campaign_id,
            clientId: row.client_id,
            timestamp: row.created_at
          }));
          setLeads(formattedLeads);
        }
      } else {
        const savedLeads = localStorage.getItem('spinToWinLeads');
        if (savedLeads) setLeads(JSON.parse(savedLeads));
      }
    };
    loadLeads();
  }, []);

  const addLead = async (leadData) => {
    const newLead = {
      id: crypto.randomUUID(),
      ...leadData,
      timestamp: new Date().toISOString(),
      deviceType: window.innerWidth > 768 ? 'desktop' : 'mobile'
    };

    setLeads(prev => [...prev, newLead]);
    localStorage.setItem('spinToWinLeads', JSON.stringify([...leads, newLead]));

    if (supabase) {
      await supabase.from('leads').insert({
        id: newLead.id,
        campaign_id: leadData.campaignId,
        client_id: leadData.clientId || null,
        data: newLead
      });
    }

    return newLead;
  };

  const getLeadsByGame = (campaignId) => {
    return leads.filter(lead => lead.campaignId === campaignId);
  };

  const exportLeads = (campaignId, startDate, endDate) => {
    let filteredLeads = leads;
    if (campaignId) {
      filteredLeads = filteredLeads.filter(lead => lead.campaignId === campaignId);
    }
    if (startDate) {
      filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) <= new Date(endDate));
    }
    return filteredLeads;
  };

  const value = { leads, addLead, getLeadsByGame, exportLeads };

  return (
    <LeadContext.Provider value={value}>
      {children}
    </LeadContext.Provider>
  );
};