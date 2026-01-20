import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

const RedemptionContext = createContext();

export const useRedemption = () => {
  const context = useContext(RedemptionContext);
  if (!context) {
    throw new Error('useRedemption must be used within a RedemptionProvider');
  }
  return context;
};

function generateShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
}

export const RedemptionProvider = ({ children }) => {
  const [redemptions, setRedemptions] = useState([]);

  useEffect(() => {
    const loadRedemptions = async () => {
      if (supabase) {
        const { data } = await supabase.from('redemptions').select('*');
        if (data) {
          const formatted = data.map(row => ({
            ...row.data,
            id: row.id,
            gameId: row.game_id || row.campaign_id,
            prizeName: row.prize_name,
            shortCode: row.short_code,
            status: row.status,
            generatedAt: row.generated_at,
            expiresAt: row.expires_at
          }));
          setRedemptions(formatted);
        }
      } else {
        const saved = localStorage.getItem('spinToWinRedemptions');
        if (saved) {
          try {
            setRedemptions(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse local redemptions', e);
          }
        }
      }
    };
    loadRedemptions();
  }, []);

  const generateRedemption = async (gameId, prize, settings = {}, leadData = {}) => {
    const now = new Date();
    const expirationDays = settings.expiryDays || 30;
    const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000).toISOString();
    const redemptionToken = crypto.randomUUID();
    const shortCode = generateShortCode();

    const newRedemption = {
      id: crypto.randomUUID(),
      shortCode,
      gameId,
      prizeName: prize.text || prize.name || 'Prize',
      prizeId: prize.id,
      generatedAt: now.toISOString(),
      expiresAt,
      status: 'valid',
      redeemedAt: null,
      deviceInfo: navigator.userAgent,
      email: leadData.email || null
    };

    setRedemptions(prev => [...prev, newRedemption]);
    localStorage.setItem('spinToWinRedemptions', JSON.stringify([...redemptions, newRedemption]));

    if (supabase) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('client_id')
        .eq('id', gameId)
        .maybeSingle();

      const clientId = campaign?.client_id || null;

      let leadId = null;
      if (leadData.email && clientId) {
        const { data: lead } = await supabase
          .from('leads')
          .insert({
            campaign_id: gameId,
            client_id: clientId,
            data: leadData,
            metadata: {
              prize_won: newRedemption.prizeName,
              captured_at: now.toISOString()
            }
          })
          .select('id')
          .maybeSingle();

        if (lead) {
          leadId = lead.id;
        }
      }

      const { data: insertedRedemption, error } = await supabase
        .from('redemptions')
        .insert({
          id: newRedemption.id,
          campaign_id: gameId,
          client_id: clientId,
          lead_id: leadId,
          prize_name: newRedemption.prizeName,
          short_code: shortCode,
          redemption_token: redemptionToken,
          token_expires_at: expiresAt,
          email: leadData.email || null,
          status: 'valid',
          expires_at: expiresAt
        })
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Supabase redemption error', error);
      } else if (insertedRedemption && leadData.email) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          fetch(`${supabaseUrl}/functions/v1/send-redemption-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ redemptionId: insertedRedemption.id })
          }).catch(err => console.error('Failed to trigger email:', err));
        }
      }
    }

    return newRedemption;
  };

  const redeemCoupon = (id) => {
    const now = new Date();
    setRedemptions(prev => prev.map(r => {
      const isActiveStatus = r.status === 'active' || r.status === 'valid';
      if (r.id === id && isActiveStatus) {
        const isExpired = r.expiresAt && new Date(r.expiresAt) < now;
        const newStatus = isExpired ? 'expired' : 'redeemed';

        if (supabase) {
          supabase.from('redemptions').update({
            status: newStatus,
            redeemed_at: now.toISOString()
          }).eq('id', id).then();
        }

        return { ...r, status: newStatus, redeemedAt: now.toISOString() };
      }
      return r;
    }));
  };

  const getRedemption = (id) => {
    return redemptions.find(item => item.id === id);
  };

  const getRedemptionsByGame = (gameId) => {
    return redemptions.filter(r => r.gameId === gameId).sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  };
  
  const updateStatus = (id, status) => {
    setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (supabase) {
      supabase.from('redemptions').update({ status }).eq('id', id).then();
    }
  };

  const value = { redemptions, generateRedemption, redeemCoupon, getRedemption, getRedemptionsByGame, updateStatus };

  return (
    <RedemptionContext.Provider value={value}>
      {children}
    </RedemptionContext.Provider>
  );
};