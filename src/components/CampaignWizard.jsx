import React, { useState } from 'react';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';

const defaultSpinConfig = {
  segments: [
    { id: '1', text: '10% Off', color: '#6366F1', probability: 30 },
    { id: '2', text: '20% Off', color: '#8B5CF6', probability: 20 },
    { id: '3', text: 'Free Shipping', color: '#10B981', probability: 25 },
    { id: '4', text: 'Try Again', color: '#EF4444', probability: 25 }
  ],
  wheelColors: {
    primary: '#6366F1',
    secondary: '#8B5CF6'
  }
};

const defaultScratchConfig = {
  foregroundImage: null,
  backgroundImage: null,
  prizes: [
    { id: '1', text: 'Winner!', probability: 30 },
    { id: '2', text: 'Try Again', probability: 70 }
  ]
};

export default function CampaignWizard({ clientId, onClose }) {
  const { createCampaign } = usePlatform();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: null,
    slug: '',
    startDate: '',
    endDate: '',
    requireEmail: true,
    requirePhone: false,
    config: {}
  });

  const handleTypeSelect = (type) => {
    setFormData({
      ...formData,
      type,
      config: type === 'spin' ? defaultSpinConfig : defaultScratchConfig
    });
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      await createCampaign({
        clientId,
        name: formData.name,
        slug,
        type: formData.type,
        status: 'draft',
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        config: {
          ...formData.config,
          leadCapture: {
            requireEmail: formData.requireEmail,
            requirePhone: formData.requirePhone
          }
        }
      });

      onClose();
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
          {[1, 2, 3].map(s => (
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <button
                onClick={() => handleTypeSelect('spin')}
                className="glass-card"
                style={{
                  padding: 'var(--space-6)',
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
                  width: '80px',
                  height: '80px',
                  margin: '0 auto var(--space-3)',
                  background: 'var(--brand-primary)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-3xl)'
                }}>
                  🎡
                </div>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>
                  Spin to Win
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  Classic prize wheel with customizable segments
                </p>
              </button>

              <button
                onClick={() => handleTypeSelect('scratch')}
                className="glass-card"
                style={{
                  padding: 'var(--space-6)',
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
                  width: '80px',
                  height: '80px',
                  margin: '0 auto var(--space-3)',
                  background: 'var(--success)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-3xl)'
                }}>
                  ✨
                </div>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>
                  Scratch to Win
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  Interactive scratch-off card experience
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 2 && formData.type && (
          <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Step 2: Configure {formData.type === 'spin' ? 'Spin Wheel' : 'Scratch Card'}
            </h3>

            {formData.type === 'spin' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  Default wheel configuration loaded. You can customize segments later.
                </p>
                <div className="glass-card" style={{ padding: 'var(--space-3)' }}>
                  {formData.config.segments?.map((segment, idx) => (
                    <div key={segment.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2)',
                      borderBottom: idx < formData.config.segments.length - 1 ? '1px solid var(--divider)' : 'none'
                    }}>
                      <span>{segment.text}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{segment.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.type === 'scratch' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  Upload images for your scratch card (can be configured later in campaign settings)
                </p>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      Foreground (Scratch-off layer)
                    </label>
                    <div className="glass-card" style={{
                      padding: 'var(--space-6)',
                      textAlign: 'center',
                      border: '2px dashed var(--border-color)'
                    }}>
                      Click to upload image
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      Background (Prize reveal)
                    </label>
                    <div className="glass-card" style={{
                      padding: 'var(--space-6)',
                      textAlign: 'center',
                      border: '2px dashed var(--border-color)'
                    }}>
                      Click to upload image
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                <FiChevronLeft /> Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)} style={{ flex: 1 }}>
                Next <FiChevronRight />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Step 3: Campaign Details
            </h3>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Start Date (Optional)
                  </label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    End Date (Optional)
                  </label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Lead Capture Requirements
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.requireEmail}
                      onChange={(e) => setFormData({ ...formData, requireEmail: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Require Email Address</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.requirePhone}
                      onChange={(e) => setFormData({ ...formData, requirePhone: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Require Phone Number</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>
                <FiChevronLeft /> Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!formData.name}
                style={{ flex: 1 }}
              >
                Create Campaign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}