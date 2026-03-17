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

  useEffect(() => {
    const loadLeads = async () => {
      if (supabase) {
        const { data } = await supabase.from('leads').select('*');
        if (data) {
          const formattedLeads = data.map(row => ({
            id: row.id,
            clientId: row.client_id,
            brandId: row.brand_id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            birthday: row.birthday,
            sourceType: row.source_type,
            metadata: row.metadata,
            timestamp: row.created_at,
            formData: { name: row.name, email: row.email, phone: row.phone }
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
        client_id: leadData.clientId || null,
        brand_id: leadData.brandId || null,
        name: leadData.formData?.name || leadData.name || '',
        email: leadData.formData?.email?.trim().toLowerCase() || leadData.email || null,
        phone: leadData.formData?.phone || leadData.phone || null,
        source_type: 'game',
        metadata: { deviceType: newLead.deviceType }
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