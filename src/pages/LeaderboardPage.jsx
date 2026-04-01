import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiClock, FiStar, FiArrowLeft, FiAward } from 'react-icons/fi';
import { supabase } from '../supabase/client';

export default function LeaderboardPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, [campaignId]);

  const loadLeaderboard = async () => {
    if (!campaignId) {
      setError('Campaign ID is required');
      setIsLoading(false);
      return;
    }

    try {
      const [campaignResult, leaderboardResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id, name, client_id, brand_id, clients(name, logo_url), brands(name, primary_color)')
          .eq('id', campaignId)
          .maybeSingle(),
        supabase
          .from('campaign_leaderboards')
          .select(`
            id,
            campaign_id,
            lead_id,
            final_score,
            time_elapsed_seconds,
            completed_at,
            leads(name, email)
          `)
          .eq('campaign_id', campaignId)
          .order('final_score', { ascending: false })
          .order('time_elapsed_seconds', { ascending: true })
      ]);

      if (campaignResult.error) throw campaignResult.error;
      if (leaderboardResult.error) throw leaderboardResult.error;

      setCampaign(campaignResult.data);

      const processedLeaderboard = [];
      const seenLeads = new Set();

      for (const entry of leaderboardResult.data || []) {
        if (!seenLeads.has(entry.lead_id)) {
          processedLeaderboard.push(entry);
          seenLeads.add(entry.lead_id);
        }
      }

      setLeaderboard(processedLeaderboard);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-400';
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) {
      return <FiAward className="w-6 h-6" />;
    }
    return <span className="text-lg font-bold">{rank}</span>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--error-bg)' }}>
            <FiAward size={32} style={{ color: 'var(--error)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Leaderboard Not Found
          </h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {error || 'This campaign does not exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const brandColor = campaign.brands?.primary_color || 'var(--accent)';
  const clientName = campaign.clients?.name || 'Unknown';
  const brandName = campaign.brands?.name || '';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-10 backdrop-blur-lg border-b" style={{ background: 'var(--bg-secondary-transparent)', borderColor: 'var(--border-color)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {campaign.clients?.logo_url && (
              <img
                src={campaign.clients.logo_url}
                alt={clientName}
                className="w-12 h-12 rounded-lg object-contain"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {campaign.name}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {brandName ? `${brandName} • ` : ''}{clientName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="glass-card p-6 md:p-8 mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FiAward size={32} style={{ color: brandColor }} />
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Leaderboard
            </h2>
          </div>
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Top performers ranked by score and completion time
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
              <FiAward size={32} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No Results Yet
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Be the first to play and make it to the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;

              return (
                <div
                  key={entry.id}
                  className="glass-card p-4 md:p-5 transition-transform hover:scale-[1.01]"
                  style={{
                    background: isTopThree ? `linear-gradient(135deg, ${brandColor}15 0%, var(--bg-secondary) 100%)` : undefined,
                    borderLeft: isTopThree ? `3px solid ${brandColor}` : undefined
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold ${getRankColor(rank)}`}
                      style={{ background: isTopThree ? `${brandColor}20` : 'var(--bg-tertiary)' }}>
                      {getRankIcon(rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                        {entry.leads?.name || 'Anonymous Player'}
                      </h3>
                      {entry.leads?.email && (
                        <p className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {entry.leads.email}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1.5 justify-end mb-1">
                        <FiStar size={16} style={{ color: brandColor }} />
                        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {Math.round(entry.final_score)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <FiClock size={14} />
                        <span>{formatTime(entry.time_elapsed_seconds)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Showing top {leaderboard.length} {leaderboard.length === 1 ? 'player' : 'players'}
            </p>
          </div>
        )}
      </main>

      <footer className="mt-12 py-8 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Powered by {clientName}
          </p>
        </div>
      </footer>
    </div>
  );
}
