import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlatform } from '../context/PlatformContext';
import GamePlayer from '../components/game/GamePlayer';
import { GameProvider } from '../context/GameContext';
import { LeadProvider } from '../context/LeadContext';
import { RedemptionProvider } from '../context/RedemptionContext';
import { campaignToGame, updateCampaignAnalytics } from '../utils/campaignAdapter';

export default function CampaignPlayer({ previewData, isPreview = false }) {
  const { slug } = useParams();
  const { getCampaignBySlug, clients, updateCampaign } = usePlatform();
  const [campaign, setCampaign] = useState(null);
  const [client, setClient] = useState(null);
  const [game, setGame] = useState(null);
  const [isLoading, setIsLoading] = useState(!previewData);

  useEffect(() => {
    if (previewData) {
      setGame(previewData);
      setIsLoading(false);
      return;
    }

    const loadCampaign = async () => {
      const foundCampaign = getCampaignBySlug(slug);
      if (foundCampaign) {
        setCampaign(foundCampaign);
        const foundClient = clients.find(c => c.id === foundCampaign.client_id);
        setClient(foundClient);

        const transformedGame = campaignToGame(foundCampaign, foundClient);
        setGame(transformedGame);

        const hasViewed = localStorage.getItem(`campaign_viewed_${foundCampaign.id}`);
        if (!hasViewed) {
          const newAnalytics = updateCampaignAnalytics(foundCampaign.analytics, 'unique_view');
          await updateCampaign(foundCampaign.id, { analytics: newAnalytics });
          localStorage.setItem(`campaign_viewed_${foundCampaign.id}`, 'true');
        }

        const viewAnalytics = updateCampaignAnalytics(foundCampaign.analytics, 'view');
        await updateCampaign(foundCampaign.id, { analytics: viewAnalytics });
      }
      setIsLoading(false);
    };
    loadCampaign();
  }, [slug, clients, getCampaignBySlug, updateCampaign, previewData]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!game && !previewData) {
    if (!campaign) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: 'var(--space-4)',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              Campaign Not Found
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              This campaign may have been removed or the link is incorrect.
            </p>
          </div>
        </div>
      );
    }
  }

  if (!isPreview && campaign && campaign.status !== 'active') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 'var(--space-4)',
        textAlign: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
            Campaign Not Available
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            This campaign is currently {campaign.status}.
          </p>
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <GameProvider externalGame={game}>
      <LeadProvider>
        <RedemptionProvider>
          <GamePlayer gameId={game.id} isPreview={isPreview} />
        </RedemptionProvider>
      </LeadProvider>
    </GameProvider>
  );
}