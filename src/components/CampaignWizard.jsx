import React, { useState, useMemo } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiHeart } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';
import { initializeCampaignConfig } from '../utils/campaignAdapter';
import { LOYALTY_ICONS, getIconById } from '../constants/loyaltyIcons';

export default function CampaignWizard({ clientId, brandId, brands = [], onClose, onCampaignCreated }) {
  const { createCampaign, clients } = usePlatform();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: null,
    slug: '',
    loyaltyProgramType: 'visit',
    loyaltyThreshold: 10,
    loyaltyValidationMethod: 'pin',
    loyaltyPinLength: 4,
    loyaltyPinType: 'numeric',
    loyaltyPinValue: '',
    loyaltyTargetIcon: 'heart',
    loyaltyIconSequence: ['heart', 'star'],
    loyaltyTargetPosition: 'top-right',
    loyaltyRewardName: 'Free Reward',
    loyaltyRewardDescription: ''
  });

  const [selectedBrandId, setSelectedBrandId] = useState(brandId || (brands[0]?.id ?? null));
  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  const handleTypeSelect = (type) => {
    setFormData({ ...formData, type });
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const fullConfig = initializeCampaignConfig(formData.type, client);

      if (formData.type === 'bizgamez') {
        fullConfig.bizgamez_code = formData.bizgamezCode || '';
      } else if (formData.type === 'loyalty') {
        fullConfig.loyalty = {
          programType: formData.loyaltyProgramType,
          threshold: formData.loyaltyThreshold,
          validationMethod: formData.loyaltyValidationMethod,
          validationConfig: buildValidationConfig(),
          rewardName: formData.loyaltyRewardName,
          rewardDescription: formData.loyaltyRewardDescription,
          resetBehavior: 'reset',
          lockoutThreshold: 3
        };
      }

      const newCampaign = await createCampaign({
        client_id: clientId,
        brand_id: selectedBrandId,
        name: formData.name,
        slug,
        type: formData.type,
        status: 'draft',
        start_date: null,
        end_date: null,
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

  const buildValidationConfig = () => {
    switch (formData.loyaltyValidationMethod) {
      case 'pin': return { pinLength: formData.loyaltyPinLength, pinType: formData.loyaltyPinType, pinValue: formData.loyaltyPinValue };
      case 'icon_single': return { targetIcon: formData.loyaltyTargetIcon };
      case 'icon_sequence': return { iconSequence: formData.loyaltyIconSequence };
      default: return {};
    }
  };

  const generateRandomPin = () => {
    const length = formData.loyaltyPinLength;
    const isAlpha = formData.loyaltyPinType === 'alphanumeric';
    const chars = isAlpha ? 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' : '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData({ ...formData, loyaltyPinValue: result });
  };

  const isLoyaltyFormValid = () => {
    if (!formData.name || !formData.loyaltyRewardName) return false;
    switch (formData.loyaltyValidationMethod) {
      case 'pin': return formData.loyaltyPinValue && formData.loyaltyPinValue.length === formData.loyaltyPinLength;
      case 'icon_single': return !!formData.loyaltyTargetIcon;
      case 'icon_sequence': return formData.loyaltyIconSequence && formData.loyaltyIconSequence.length >= 2;
      default: return true;
    }
  };

  const totalSteps = formData.type === 'loyalty' ? 3 : 2;

  const campaignTypes = [
    {
      id: 'bizgamez',
      name: 'BizGamez',
      description: 'External game with webhook integration',
      icon: <span className="font-bold" style={{ color: '#fff' }}>BG</span>,
      color: '#F97316'
    },
    {
      id: 'loyalty',
      name: 'Loyalty Program',
      description: 'Digital punch card with staff validation',
      icon: <FiHeart style={{ color: '#fff' }} />,
      color: '#F43F5E'
    }
  ];

  const getAccentColor = () => {
    if (formData.type === 'loyalty') return '#F43F5E';
    return '#F97316';
  };

  return (
    <div className="fixed inset-0 flex items-end md:items-center justify-center z-50 p-0 md:p-4" style={{ background: 'var(--overlay-bg)' }}>
      <div className="w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl md:rounded-xl" style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)' }}>
        <div className="sticky top-0 p-4 md:p-6 flex-shrink-0" style={{ background: 'var(--modal-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create New Campaign</h2>
            <button onClick={onClose} className="p-2 -mr-2 rounded-full transition-colors" style={{ color: 'var(--icon-secondary)' }}>
              <FiX size={24} />
            </button>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const s = i + 1;
              return (
                <div key={s} className="flex-1 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors" style={{ background: s <= step ? getAccentColor() : 'var(--bg-tertiary)', color: s <= step ? '#fff' : 'var(--text-tertiary)' }}>{s}</div>
                  <div className="flex-1 h-1 rounded-full transition-colors" style={{ background: s <= step ? getAccentColor() : 'var(--bg-tertiary)' }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {step === 1 && (
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Select Campaign Type</h3>
              {brands.length > 1 && (
                <div className="mb-4">
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Brand</label>
                  <select
                    className="select"
                    value={selectedBrandId || ''}
                    onChange={(e) => setSelectedBrandId(e.target.value || null)}
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {campaignTypes.map((type) => (
                  <button key={type.id} onClick={() => handleTypeSelect(type.id)} className="p-4 md:p-5 rounded-xl text-left border-2 transition-all active:scale-[0.98]" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = type.color; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: type.color }}>{type.icon}</div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{type.name}</h4>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{type.description}</p>
                      </div>
                      <FiChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--icon-muted)' }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && formData.type === 'bizgamez' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>BizGamez Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Game Name *</label>
                  <input className="input" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Fossil Creek Title 1" required />
                </div>
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>BizGamez Code *</label>
                  <input className="input" type="text" value={formData.bizgamezCode || ''} onChange={(e) => setFormData({ ...formData, bizgamezCode: e.target.value })} placeholder="fossil-creek-title-1" />
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>This must match the game_code sent in the webhook from BizGamez/Playzo</p>
                </div>
                <div className="p-4 rounded-r-lg" style={{ background: 'rgba(249, 115, 22, 0.1)', borderLeft: '4px solid #F97316' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> When a player completes a game in BizGamez/Playzo, the webhook will send their score and contact info to this campaign.</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && formData.type === 'loyalty' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Loyalty Program Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Campaign Name *</label>
                  <input className="input" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Coffee Rewards" required />
                </div>
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Campaign Slug (URL path)</label>
                  <input className="input" type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder={formData.name ? formData.name.toLowerCase().replace(/\s+/g, '-') : 'coffee-rewards'} />
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>Members will access this at: /loyalty/{formData.slug || 'your-program-slug'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Program Type</label>
                    <select className="select" value={formData.loyaltyProgramType} onChange={(e) => setFormData({ ...formData, loyaltyProgramType: e.target.value })}>
                      <option value="visit">Visit-Based</option>
                      <option value="action">Action-Based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formData.loyaltyProgramType === 'visit' ? 'Visits' : 'Actions'} Required</label>
                    <input className="input" type="number" min="1" max="100" value={formData.loyaltyThreshold} onChange={(e) => setFormData({ ...formData, loyaltyThreshold: parseInt(e.target.value) || 10 })} />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Reward Name *</label>
                  <input className="input" type="text" value={formData.loyaltyRewardName} onChange={(e) => setFormData({ ...formData, loyaltyRewardName: e.target.value })} placeholder="Free Coffee" />
                </div>
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Reward Description</label>
                  <textarea className="input" rows={2} value={formData.loyaltyRewardDescription} onChange={(e) => setFormData({ ...formData, loyaltyRewardDescription: e.target.value })} placeholder="Get any drink free on your next visit!" style={{ resize: 'none' }} />
                </div>
                <div className="p-4 rounded-r-lg" style={{ background: 'rgba(244, 63, 94, 0.1)', borderLeft: '4px solid #F43F5E' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> Customers collect {formData.loyaltyThreshold} stamps by {formData.loyaltyProgramType === 'visit' ? 'visiting your business' : 'completing purchases'}. Staff validates each stamp using a secure verification method.</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && formData.type === 'loyalty' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Staff Validation Method</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Validation Method</label>
                  <select className="select" value={formData.loyaltyValidationMethod} onChange={(e) => setFormData({ ...formData, loyaltyValidationMethod: e.target.value })}>
                    <option value="pin">PIN Code</option>
                    <option value="icon_single">Icon Selection</option>
                    <option value="icon_sequence">Icon Sequence</option>
                  </select>
                </div>

                {formData.loyaltyValidationMethod === 'pin' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>PIN Length</label>
                        <select className="select" value={formData.loyaltyPinLength} onChange={(e) => setFormData({ ...formData, loyaltyPinLength: parseInt(e.target.value), loyaltyPinValue: '' })}>
                          {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} digits</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>PIN Type</label>
                        <select className="select" value={formData.loyaltyPinType} onChange={(e) => setFormData({ ...formData, loyaltyPinType: e.target.value, loyaltyPinValue: '' })}>
                          <option value="numeric">Numbers only</option>
                          <option value="alphanumeric">Letters & Numbers</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>PIN Value *</label>
                      <div className="flex gap-2">
                        <input className="input flex-1 text-center tracking-widest font-mono text-lg" type="text" maxLength={formData.loyaltyPinLength} value={formData.loyaltyPinValue} onChange={(e) => { const val = formData.loyaltyPinType === 'numeric' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); setFormData({ ...formData, loyaltyPinValue: val }); }} placeholder={'*'.repeat(formData.loyaltyPinLength)} />
                        <button type="button" onClick={generateRandomPin} className="btn btn-secondary">Generate</button>
                      </div>
                    </div>
                  </>
                )}

                {formData.loyaltyValidationMethod === 'icon_single' && (
                  <div>
                    <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Select Target Icon</label>
                    <div className="grid grid-cols-8 gap-2">
                      {LOYALTY_ICONS.map((icon) => {
                        const IconComp = icon.icon;
                        const isSelected = formData.loyaltyTargetIcon === icon.id;
                        return (
                          <button key={icon.id} type="button" onClick={() => setFormData({ ...formData, loyaltyTargetIcon: icon.id })} className="p-3 rounded-lg transition-all" style={{ background: isSelected ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-tertiary)', boxShadow: isSelected ? '0 0 0 2px #F43F5E' : 'none' }}>
                            <IconComp size={20} style={{ color: isSelected ? icon.color : 'var(--text-tertiary)' }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.loyaltyValidationMethod === 'icon_sequence' && (
                  <div>
                    <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Select Icons in Order (click to add/remove)</label>
                    <div className="mb-3 p-3 rounded-lg min-h-[56px] flex items-center gap-2 flex-wrap" style={{ background: 'var(--bg-tertiary)' }}>
                      {formData.loyaltyIconSequence.length === 0 ? (
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Click icons below to build sequence...</span>
                      ) : (
                        formData.loyaltyIconSequence.map((iconId, idx) => {
                          const icon = getIconById(iconId);
                          if (!icon) return null;
                          const IconComp = icon.icon;
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.2)' }}>
                                <IconComp size={20} style={{ color: icon.color }} />
                              </div>
                              {idx < formData.loyaltyIconSequence.length - 1 && <span style={{ color: 'var(--text-tertiary)' }}>→</span>}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {LOYALTY_ICONS.map((icon) => {
                        const IconComp = icon.icon;
                        const sequenceIndex = formData.loyaltyIconSequence.indexOf(icon.id);
                        const isInSequence = sequenceIndex !== -1;
                        return (
                          <button key={icon.id} type="button" onClick={() => { if (isInSequence) { setFormData({ ...formData, loyaltyIconSequence: formData.loyaltyIconSequence.filter(id => id !== icon.id) }); } else if (formData.loyaltyIconSequence.length < 5) { setFormData({ ...formData, loyaltyIconSequence: [...formData.loyaltyIconSequence, icon.id] }); } }} className="p-3 rounded-lg transition-all relative" style={{ background: isInSequence ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-tertiary)', boxShadow: isInSequence ? '0 0 0 2px #F43F5E' : 'none' }}>
                            <IconComp size={20} style={{ color: isInSequence ? icon.color : 'var(--text-tertiary)' }} />
                            {isInSequence && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: '#F43F5E', color: '#fff' }}>{sequenceIndex + 1}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>Select 2-5 icons for the sequence</p>
                  </div>
                )}

                <div className="p-4 rounded-lg" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <p className="text-sm" style={{ color: 'var(--warning-text, var(--warning))' }}><strong>Security:</strong> After 3 failed validation attempts, the customer's card will be locked and require manager override to unlock.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 2 && formData.type === 'bizgamez' && (
          <div className="sticky bottom-0 p-4 md:p-6 flex-shrink-0" style={{ background: 'var(--modal-footer-bg)', borderTop: '1px solid var(--border-color)' }}>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex items-center gap-2" onClick={() => setStep(1)}>
                <FiChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
              </button>
              <button className="btn flex-1 flex items-center justify-center gap-2" style={{ background: '#F97316', color: '#fff', opacity: (!formData.name || !formData.bizgamezCode) ? 0.5 : 1 }} onClick={handleSubmit} disabled={!formData.name || !formData.bizgamezCode}>
                Create & Open Editor
              </button>
            </div>
          </div>
        )}

        {step === 2 && formData.type === 'loyalty' && (
          <div className="sticky bottom-0 p-4 md:p-6 flex-shrink-0" style={{ background: 'var(--modal-footer-bg)', borderTop: '1px solid var(--border-color)' }}>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex items-center gap-2" onClick={() => setStep(1)}>
                <FiChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
              </button>
              <button className="btn flex-1 flex items-center justify-center gap-2" style={{ background: '#F43F5E', color: '#fff', opacity: (!formData.name || !formData.loyaltyRewardName) ? 0.5 : 1 }} onClick={() => setStep(3)} disabled={!formData.name || !formData.loyaltyRewardName}>
                Next: Validation Setup <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && formData.type === 'loyalty' && (
          <div className="sticky bottom-0 p-4 md:p-6 flex-shrink-0" style={{ background: 'var(--modal-footer-bg)', borderTop: '1px solid var(--border-color)' }}>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex items-center gap-2" onClick={() => setStep(2)}>
                <FiChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
              </button>
              <button className="btn flex-1 flex items-center justify-center gap-2" style={{ background: '#F43F5E', color: '#fff', opacity: !isLoyaltyFormValid() ? 0.5 : 1 }} onClick={handleSubmit} disabled={!isLoyaltyFormValid()}>
                Create Loyalty Program
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}