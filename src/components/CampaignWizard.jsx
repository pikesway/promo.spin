import React, { useState, useMemo } from 'react';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';
import { initializeCampaignConfig } from '../utils/campaignAdapter';

export default function CampaignWizard({ clientId, onClose, onCampaignCreated }) {
  const { createCampaign, clients } = usePlatform();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: null,
    slug: '',
    spinLimit: 'one-per-user',
    spinDelayHours: 24
  });

  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  const handleTypeSelect = (type) => {
    setFormData({
      ...formData,
      type
    });
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const fullConfig = initializeCampaignConfig(formData.type, client);

      if (formData.type === 'bizgamez') {
        fullConfig.bizgamez_code = formData.bizgamezCode || '';
      } else {
        fullConfig.settings.spinLimit = formData.spinLimit;
        fullConfig.settings.spinDelayHours = formData.spinDelayHours;
      }

      const newCampaign = await createCampaign({
        clientId,
        name: formData.name,
        slug,
        type: formData.type,
        status: 'draft',
        startDate: null,
        endDate: null,
        config: fullConfig
      });

      onClose();

      if (onCampaignCreated && newCampaign) {
        onCampaignCreated(newCampaign);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 'var(--z-modal)',
      padding: 'var(--space-3)',
      overflowY: 'auto'
    }}>
      <div className="glass-card" style={{
        maxWidth: '700px',
        width: '100%',
        padding: 'var(--space-6)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)' }}>
            Create New Campaign
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <FiX size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1,
              height: '4px',
              background: s <= step ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-full)',
              transition: 'background var(--transition-fast)'
            }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Step 1: Select Campaign Type
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
              <button
                onClick={() => handleTypeSelect('spin')}
                className="glass-card"
                style={{
                  padding: 'var(--space-4)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  margin: '0 auto var(--space-2)',
                  background: 'var(--brand-primary)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-2xl)'
                }}>
                  <FiChevronRight style={{ transform: 'rotate(-45deg)' }} />
                </div>
                <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>
                  Spin to Win
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  Classic prize wheel with customizable segments
                </p>
              </button>

              <button
                onClick={() => handleTypeSelect('scratch')}
                className="glass-card"
                style={{
                  padding: 'var(--space-4)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  margin: '0 auto var(--space-2)',
                  background: 'var(--success)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-2xl)'
                }}>
                  <FiX style={{ transform: 'rotate(45deg)' }} />
                </div>
                <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>
                  Scratch to Win
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  Interactive scratch-off card experience
                </p>
              </button>

              <button
                onClick={() => handleTypeSelect('bizgamez')}
                className="glass-card"
                style={{
                  padding: 'var(--space-4)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#F97316'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  margin: '0 auto var(--space-2)',
                  background: '#F97316',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-2xl)',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  BG
                </div>
                <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>
                  BizGamez
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  External game with webhook integration
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 2 && formData.type && formData.type !== 'bizgamez' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Step 2: Basic Settings
            </h3>

            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Campaign Name *
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale 2026"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Campaign Slug (URL path)
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder={formData.name ? formData.name.toLowerCase().replace(/\s+/g, '-') : 'summer-sale-2026'}
                />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  Players will access this at: /play/{formData.slug || 'your-campaign-slug'}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Spin Limit *
                </label>
                <select
                  className="input"
                  value={formData.spinLimit}
                  onChange={(e) => setFormData({ ...formData, spinLimit: e.target.value })}
                >
                  <option value="unlimited">Unlimited - Players can spin as many times as they want</option>
                  <option value="one-per-user">One Per User - Each player can only spin once ever</option>
                  <option value="one-per-session">One Per Session - One spin per browser session</option>
                  <option value="time-limit">Time Limit - Wait between spins</option>
                  <option value="calendar-limit">Calendar Limit - Reset weekly or monthly</option>
                </select>
              </div>

              {formData.spinLimit === 'time-limit' && (
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Hours Between Spins
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="168"
                    value={formData.spinDelayHours}
                    onChange={(e) => setFormData({ ...formData, spinDelayHours: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                  Campaign will inherit {client?.name}'s branding (logo and colors). You can customize all screens, prizes, and settings in the editor after creation.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                <FiChevronLeft /> Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!formData.name}
                style={{ flex: 1 }}
              >
                Create & Open Editor
              </button>
            </div>
          </div>
        )}

        {step === 2 && formData.type === 'bizgamez' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Step 2: BizGamez Settings
            </h3>

            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Game Name *
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Fossil Creek Title 1"
                  required
                />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  Internal name for this campaign
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  BizGamez Code *
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.bizgamezCode || ''}
                  onChange={(e) => setFormData({ ...formData, bizgamezCode: e.target.value })}
                  placeholder="fossil-creek-title-1"
                />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  This must match the game_code sent in the webhook from BizGamez/Playzo
                </p>
              </div>

              <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderLeft: '3px solid #F97316' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                  <strong>How it works:</strong> When a player completes a game in BizGamez/Playzo, the webhook will send their score and contact info to this campaign. You can configure prizes and win/lose outcomes in the editor.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                <FiChevronLeft /> Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!formData.name || !formData.bizgamezCode}
                style={{ flex: 1 }}
              >
                Create & Open Editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}