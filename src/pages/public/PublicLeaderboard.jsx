import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiClock, FiStar, FiAward, FiTrendingUp } from 'react-icons/fi';
import { supabase } from '../../supabase/client';

const DEVICE_ID_KEY = 'leaderboard_device_id';

export default function PublicLeaderboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [instance, setInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  const campaignIdParam = searchParams.get('campaign_id');
  const instanceIdParam = searchParams.get('instance_id');
  const deviceIdParam = searchParams.get('device_id');

  useEffect(() => {
    let storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (deviceIdParam) {
      localStorage.setItem(DEVICE_ID_KEY, deviceIdParam);
      storedDeviceId = deviceIdParam;
    }

    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    }

    loadLeaderboard();
  }, [campaignIdParam, instanceIdParam, deviceIdParam]);

  const loadLeaderboard = async () => {
    if (!instanceIdParam && !campaignIdParam) {
      setError('Campaign ID or Instance ID is required');
      setIsLoading(false);
      return;
    }

    const scopeId = instanceIdParam || campaignIdParam;
    const isInstanceScope = !!instanceIdParam;

    try {
      let campaignResult;
      let instanceResult = null;

      if (isInstanceScope) {
        const [instData, campData] = await Promise.all([
          supabase
            .from('campaign_game_instances')
            .select('*, campaigns(id, name, client_id, brand_id, clients(name, logo_url, primary_color), brands(name, primary_color))')
            .eq('id', instanceIdParam)
            .maybeSingle(),
          supabase
            .from('campaigns')
            .select('id, name, client_id, brand_id, clients(name, logo_url, primary_color), brands(name, primary_color)')
            .eq('id', campaignIdParam)
            .maybeSingle()
        ]);

        if (instData.error) throw instData.error;
        instanceResult = instData;

        if (instData.data?.campaigns) {
          campaignResult = { data: instData.data.campaigns, error: null };
        } else if (campData.data) {
          campaignResult = campData;
        }
      } else {
        campaignResult = await supabase
          .from('campaigns')
          .select('id, name, client_id, brand_id, clients(name, logo_url, primary_color), brands(name, primary_color)')
          .eq('id', campaignIdParam)
          .maybeSingle();
      }

      if (campaignResult?.error) throw campaignResult.error;

      let leaderboardQuery = supabase
        .from('campaign_leaderboards')
        .select(`
          id,
          campaign_id,
          lead_id,
          final_score,
          time_elapsed_seconds,
          completed_at,
          metadata,
          leads(name, email)
        `)
        .order('final_score', { ascending: false })
        .order('time_elapsed_seconds', { ascending: true });

      if (isInstanceScope) {
        leaderboardQuery = leaderboardQuery.eq('metadata->>instance_id', instanceIdParam);
      } else {
        leaderboardQuery = leaderboardQuery.eq('campaign_id', campaignIdParam);
      }

      const leaderboardResult = await leaderboardQuery;

      if (leaderboardResult.error) throw leaderboardResult.error;

      setCampaign(campaignResult.data);
      if (instanceResult?.data) {
        setInstance(instanceResult.data);
      }

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

  const isMyEntry = (entry) => {
    if (!deviceId) return false;
    return entry.metadata?.device_id === deviceId;
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
            {error || 'This leaderboard does not exist or has been removed.'}
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

  const brandColor = campaign.brands?.primary_color || campaign.clients?.primary_color || 'var(--accent)';
  const clientName = campaign.clients?.name || 'Unknown';
  const brandName = campaign.brands?.name || '';
  const displayName = instance ? instance.name : campaign.name;

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
                {displayName}
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
            <FiTrendingUp size={32} style={{ color: brandColor }} />
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
              const isPersonal = isMyEntry(entry);

              return (
                <div
                  key={entry.id}
                  className="glass-card p-4 md:p-5 transition-all duration-300"
                  style={{
                    background: isPersonal
                      ? `linear-gradient(135deg, ${brandColor}40 0%, ${brandColor}20 100%)`
                      : isTopThree
                        ? `linear-gradient(135deg, ${brandColor}15 0%, var(--bg-secondary) 100%)`
                        : undefined,
                    borderLeft: isPersonal
                      ? `4px solid ${brandColor}`
                      : isTopThree
                        ? `3px solid ${brandColor}`
                        : undefined,
                    boxShadow: isPersonal ? `0 0 20px ${brandColor}40` : undefined,
                    transform: isPersonal ? 'scale(1.02)' : undefined
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold ${getRankColor(rank)}`}
                      style={{
                        background: isPersonal
                          ? `${brandColor}60`
                          : isTopThree
                            ? `${brandColor}20`
                            : 'var(--bg-tertiary)'
                      }}>
                      {getRankIcon(rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                          {entry.leads?.name || 'Anonymous Player'}
                        </h3>
                        {isPersonal && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{
                            background: brandColor,
                            color: 'white'
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
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
