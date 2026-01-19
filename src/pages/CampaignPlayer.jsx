import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlatform } from '../context/PlatformContext';
import SpinWheel from '../components/games/SpinWheel';
import ScratchCard from '../components/games/ScratchCard';
import RedemptionTicket from '../components/games/RedemptionTicket';

export default function CampaignPlayer() {
  const { slug } = useParams();
  const { getCampaignBySlug, createLead, createRedemption, clients } = usePlatform();
  const [campaign, setCampaign] = useState(null);
  const [client, setClient] = useState(null);
  const [screen, setScreen] = useState('start');
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });
  const [prizeWon, setPrizeWon] = useState(null);
  const [redemption, setRedemption] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCampaign = async () => {
      const foundCampaign = getCampaignBySlug(slug);
      if (foundCampaign) {
        setCampaign(foundCampaign);
        const foundClient = clients.find(c => c.id === foundCampaign.client_id);
        setClient(foundClient);
      }
      setIsLoading(false);
    };
    loadCampaign();
  }, [slug]);

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      await createLead({
        campaignId: campaign.id,
        clientId: campaign.client_id,
        data: leadData
      });
      setScreen('game');
    } catch (error) {
      console.error('Error submitting lead:', error);
      alert('Failed to submit. Please try again.');
    }
  };

  const handleGameComplete = async (prize) => {
    setPrizeWon(prize);

    if (prize.text !== 'Try Again' && prize.text !== 'Better Luck Next Time') {
      const newRedemption = await createRedemption({
        campaignId: campaign.id,
        clientId: campaign.client_id,
        prizeName: prize.text,
        expiresAt: null
      });
      setRedemption(newRedemption);
      setScreen('win');
    } else {
      setScreen('lose');
    }
  };

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

  if (campaign.status !== 'active') {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-3)'
    }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        {screen === 'start' && (
          <div className="glass-card fade-in" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            {client?.logo_url && (
              <img
                src={client.logo_url}
                alt={client.name}
                style={{
                  maxWidth: '150px',
                  height: 'auto',
                  margin: '0 auto var(--space-4)',
                  display: 'block'
                }}
              />
            )}
            <h1 style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-bold)',
              marginBottom: 'var(--space-2)',
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {campaign.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-6)' }}>
              {campaign.type === 'spin' ? 'Spin the wheel for a chance to win!' : 'Scratch to reveal your prize!'}
            </p>
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={() => setScreen('leadCapture')}
            >
              Get Started
            </button>
          </div>
        )}

        {screen === 'leadCapture' && (
          <div className="glass-card fade-in" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>
              Enter Your Details
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              We'll send your prize details here
            </p>
            <form onSubmit={handleLeadSubmit}>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Name
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={leadData.name}
                    onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                {campaign.config?.leadCapture?.requireEmail !== false && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      Email
                    </label>
                    <input
                      className="input"
                      type="email"
                      value={leadData.email}
                      onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                )}

                {campaign.config?.leadCapture?.requirePhone && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      Phone
                    </label>
                    <input
                      className="input"
                      type="tel"
                      value={leadData.phone}
                      onChange={(e) => setLeadData({ ...leadData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" style={{ marginTop: 'var(--space-4)' }}>
                Continue
              </button>
            </form>
          </div>
        )}

        {screen === 'game' && (
          <div className="fade-in">
            {campaign.type === 'spin' ? (
              <SpinWheel
                config={campaign.config}
                onComplete={handleGameComplete}
              />
            ) : (
              <ScratchCard
                config={campaign.config}
                onComplete={handleGameComplete}
              />
            )}
          </div>
        )}

        {screen === 'win' && redemption && (
          <RedemptionTicket
            prize={prizeWon}
            redemption={redemption}
            campaign={campaign}
            client={client}
          />
        )}

        {screen === 'lose' && (
          <div className="glass-card fade-in" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: 'var(--space-3)' }}>😔</div>
            <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              {prizeWon?.text || 'Better Luck Next Time'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
              Thanks for playing! Check back soon for more chances to win.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}