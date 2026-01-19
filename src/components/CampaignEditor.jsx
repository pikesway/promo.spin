import React, { useState } from 'react';
import { FiArrowLeft, FiSettings, FiLayout, FiMonitor, FiEye, FiSave, FiX, FiExternalLink } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';

export default function CampaignEditor({ campaign, client, onClose }) {
  const { updateCampaign } = usePlatform();
  const [activeTab, setActiveTab] = useState('settings');
  const [campaignData, setCampaignData] = useState(campaign);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCampaign(campaign.id, campaignData);
      setHasChanges(false);
      alert('Campaign saved successfully!');
    } catch (error) {
      alert('Failed to save campaign: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCampaignData = (updates) => {
    setCampaignData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateConfig = (configUpdates) => {
    setCampaignData(prev => ({
      ...prev,
      config: { ...prev.config, ...configUpdates }
    }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'design', label: 'Design', icon: FiLayout },
    { id: 'screens', label: 'Screens', icon: FiMonitor },
    { id: 'preview', label: 'Preview', icon: FiEye }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg-primary)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        height: '64px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: 'var(--space-2)' }}
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
              {campaignData.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '2px' }}>
              {hasChanges && (
                <>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981'
                  }}></span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    Unsaved changes
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <FiSave size={16} />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <nav style={{
          width: '250px',
          borderRight: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  borderLeft: `2px solid ${activeTab === tab.id ? 'var(--brand-primary)' : 'transparent'}`,
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-6)'
        }}>
          {activeTab === 'settings' && (
            <SettingsTab
              campaign={campaignData}
              onUpdate={updateCampaignData}
              onConfigUpdate={updateConfig}
            />
          )}
          {activeTab === 'design' && (
            <DesignTab
              campaign={campaignData}
              client={client}
              onConfigUpdate={updateConfig}
            />
          )}
          {activeTab === 'screens' && (
            <ScreensTab
              campaign={campaignData}
              onConfigUpdate={updateConfig}
            />
          )}
          {activeTab === 'preview' && (
            <PreviewTab campaign={campaignData} />
          )}
        </main>
      </div>
    </div>
  );
}

function SettingsTab({ campaign, onUpdate, onConfigUpdate }) {
  const config = campaign.config || {};
  const leadCapture = config.leadCapture || {};

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-6)' }}>
        Campaign Settings
      </h2>

      <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Basic Information
        </h3>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Campaign Name</label>
            <input
              type="text"
              value={campaign.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">URL Slug</label>
            <div className="slug-preview" style={{ marginBottom: 'var(--space-2)' }}>
              /play/{campaign.slug}
            </div>
            <input
              type="text"
              value={campaign.slug}
              onChange={(e) => onUpdate({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select
              value={campaign.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              className="form-input"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Lead Capture
        </h3>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={leadCapture.requireEmail !== false}
              onChange={(e) => onConfigUpdate({
                leadCapture: { ...leadCapture, requireEmail: e.target.checked }
              })}
              style={{ width: '18px', height: '18px' }}
            />
            <span>Require Email</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={leadCapture.requirePhone || false}
              onChange={(e) => onConfigUpdate({
                leadCapture: { ...leadCapture, requirePhone: e.target.checked }
              })}
              style={{ width: '18px', height: '18px' }}
            />
            <span>Require Phone Number</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={leadCapture.requireName || false}
              onChange={(e) => onConfigUpdate({
                leadCapture: { ...leadCapture, requireName: e.target.checked }
              })}
              style={{ width: '18px', height: '18px' }}
            />
            <span>Require Name</span>
          </label>
        </div>
      </div>

      {campaign.type === 'spin' && (
        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Spin Wheel Configuration
          </h3>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {(config.segments || []).map((segment, index) => (
              <div key={segment.id} className="glass-card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-3)', alignItems: 'end' }}>
                  <div>
                    <label className="form-label">Prize Text</label>
                    <input
                      type="text"
                      value={segment.text}
                      onChange={(e) => {
                        const newSegments = [...config.segments];
                        newSegments[index] = { ...segment, text: e.target.value };
                        onConfigUpdate({ segments: newSegments });
                      }}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Probability (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={segment.probability}
                      onChange={(e) => {
                        const newSegments = [...config.segments];
                        newSegments[index] = { ...segment, probability: parseInt(e.target.value) || 0 };
                        onConfigUpdate({ segments: newSegments });
                      }}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Color</label>
                    <input
                      type="color"
                      value={segment.color}
                      onChange={(e) => {
                        const newSegments = [...config.segments];
                        newSegments[index] = { ...segment, color: e.target.value };
                        onConfigUpdate({ segments: newSegments });
                      }}
                      className="form-input"
                      style={{ height: '40px' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesignTab({ campaign, client, onConfigUpdate }) {
  const config = campaign.config || {};
  const branding = config.branding || {};
  const useClientBranding = branding.useClientBranding !== false;

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-6)' }}>
        Design & Branding
      </h2>

      <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Brand Colors
        </h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useClientBranding}
            onChange={(e) => onConfigUpdate({
              branding: { ...branding, useClientBranding: e.target.checked }
            })}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Use Client Brand Colors</span>
        </label>

        {useClientBranding && client && (
          <div style={{
            padding: 'var(--space-4)',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            gap: 'var(--space-4)',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                Primary Color
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-md)',
                background: client.primary_color,
                border: '2px solid var(--border-color)'
              }}></div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                {client.primary_color}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                Secondary Color
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-md)',
                background: client.secondary_color,
                border: '2px solid var(--border-color)'
              }}></div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                {client.secondary_color}
              </div>
            </div>
          </div>
        )}

        {!useClientBranding && (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div>
              <label className="form-label">Primary Color</label>
              <input
                type="color"
                value={branding.customColors?.primary || '#6366F1'}
                onChange={(e) => onConfigUpdate({
                  branding: {
                    ...branding,
                    customColors: {
                      ...(branding.customColors || {}),
                      primary: e.target.value
                    }
                  }
                })}
                className="form-input"
                style={{ height: '50px' }}
              />
            </div>
            <div>
              <label className="form-label">Secondary Color</label>
              <input
                type="color"
                value={branding.customColors?.secondary || '#8B5CF6'}
                onChange={(e) => onConfigUpdate({
                  branding: {
                    ...branding,
                    customColors: {
                      ...(branding.customColors || {}),
                      secondary: e.target.value
                    }
                  }
                })}
                className="form-input"
                style={{ height: '50px' }}
              />
            </div>
          </div>
        )}
      </div>

      {client?.logo_url && (
        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Client Logo
          </h3>
          <img
            src={client.logo_url}
            alt={client.name}
            style={{
              maxWidth: '200px',
              maxHeight: '100px',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </div>
  );
}

function ScreensTab({ campaign, onConfigUpdate }) {
  const config = campaign.config || {};
  const screens = config.screens || {};

  const updateScreen = (screenName, updates) => {
    onConfigUpdate({
      screens: {
        ...screens,
        [screenName]: {
          ...(screens[screenName] || {}),
          ...updates
        }
      }
    });
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-6)' }}>
        Screen Customization
      </h2>

      <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Start Screen
        </h3>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Headline</label>
            <input
              type="text"
              value={screens.start?.headline || 'Spin to Win!'}
              onChange={(e) => updateScreen('start', { headline: e.target.value })}
              className="form-input"
              placeholder="Spin to Win!"
            />
          </div>
          <div>
            <label className="form-label">Subtitle</label>
            <textarea
              value={screens.start?.subtitle || 'Try your luck for amazing prizes'}
              onChange={(e) => updateScreen('start', { subtitle: e.target.value })}
              className="form-input"
              rows="2"
              placeholder="Try your luck for amazing prizes"
            />
          </div>
          <div>
            <label className="form-label">Button Text</label>
            <input
              type="text"
              value={screens.start?.buttonText || 'Start Game'}
              onChange={(e) => updateScreen('start', { buttonText: e.target.value })}
              className="form-input"
              placeholder="Start Game"
            />
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Win Screen
        </h3>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Headline</label>
            <input
              type="text"
              value={screens.win?.headline || 'Congratulations!'}
              onChange={(e) => updateScreen('win', { headline: e.target.value })}
              className="form-input"
              placeholder="Congratulations!"
            />
          </div>
          <div>
            <label className="form-label">Message</label>
            <textarea
              value={screens.win?.message || 'You won {prize}!'}
              onChange={(e) => updateScreen('win', { message: e.target.value })}
              className="form-input"
              rows="2"
              placeholder="You won {prize}!"
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
              Use {'{prize}'} to display the prize text
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Redemption Screen
        </h3>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Instructions</label>
            <textarea
              value={screens.redemption?.instructions || 'Show this code to redeem your prize'}
              onChange={(e) => updateScreen('redemption', { instructions: e.target.value })}
              className="form-input"
              rows="3"
              placeholder="Show this code to redeem your prize"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTab({ campaign }) {
  const playUrl = `${window.location.origin}/#/play/${campaign.slug}`;

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-6)' }}>
        Preview & Test
      </h2>

      <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Campaign URL
        </h3>
        <div className="slug-preview" style={{ marginBottom: 'var(--space-3)' }}>
          {playUrl}
        </div>
        <button
          onClick={() => window.open(`#/play/${campaign.slug}`, '_blank')}
          className="btn btn-primary"
        >
          <FiExternalLink style={{ marginRight: 'var(--space-2)' }} />
          Open in New Tab
        </button>
      </div>

      <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Campaign Details
        </h3>
        <div style={{ display: 'grid', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Type:</span>
            <span style={{ textTransform: 'capitalize' }}>{campaign.type}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Status:</span>
            <span style={{ textTransform: 'capitalize' }}>{campaign.status}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Created:</span>
            <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
