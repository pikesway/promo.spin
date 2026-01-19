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
            gameId: row.game_id,
            prizeName: row.prize_name,
            shortCode: row.short_code,
            status: row.status,
            generatedAt: row.created_at,
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

  const generateRedemption = (gameId, prize, settings = {}) => {
    const now = new Date();
    let expiresAt = null;
    if (settings.expirationMinutes) {
      expiresAt = new Date(now.getTime() + settings.expirationMinutes * 60000).toISOString();
    }

    const newRedemption = {
      id: crypto.randomUUID(),
      shortCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      gameId,
      prizeName: prize.text || 'Prize',
      prizeId: prize.id,
      generatedAt: now.toISOString(),
      expiresAt,
      status: 'active',
      redeemedAt: null,
      deviceInfo: navigator.userAgent
    };

    setRedemptions(prev => [...prev, newRedemption]);
    localStorage.setItem('spinToWinRedemptions', JSON.stringify([...redemptions, newRedemption]));

    if (supabase) {
      supabase.from('redemptions').insert({
        id: newRedemption.id,
        game_id: gameId,
        prize_name: newRedemption.prizeName,
        short_code: newRedemption.shortCode,
        status: 'active',
        expires_at: expiresAt,
        data: newRedemption
      }).then(({ error }) => {
        if (error) console.error('Supabase redemption error', error);
      });
    }

    return newRedemption;
  };

  const redeemCoupon = (id) => {
    const now = new Date();
    setRedemptions(prev => prev.map(r => {
      if (r.id === id && r.status === 'active') {
        const isExpired = r.expiresAt && new Date(r.expiresAt) < now;
        const newStatus = isExpired ? 'expired' : 'redeemed';
        
        // Update Supabase
        if (supabase) {
          supabase.from('redemptions').update({
            status: newStatus,
            data: { ...r, status: newStatus, redeemedAt: now.toISOString() }
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