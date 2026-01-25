import React, { useState, useMemo } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiHeart } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';
import { initializeCampaignConfig } from '../utils/campaignAdapter';
import { LOYALTY_ICONS, getIconById } from '../constants/loyaltyIcons';

export default function CampaignWizard({ clientId, onClose, onCampaignCreated }) {
  const { createCampaign, clients } = usePlatform();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: null,
    slug: '',
    spinLimit: 'one-per-user',
    spinDelayHours: 24,
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

  const buildValidationConfig = () => {
    switch (formData.loyaltyValidationMethod) {
      case 'pin':
        return {
          pinLength: formData.loyaltyPinLength,
          pinType: formData.loyaltyPinType,
          pinValue: formData.loyaltyPinValue
        };
      case 'icon_single':
        return {
          targetIcon: formData.loyaltyTargetIcon
        };
      case 'icon_sequence':
        return {
          iconSequence: formData.loyaltyIconSequence
        };
      case 'icon_position':
        return {
          targetIcon: formData.loyaltyTargetIcon,
          targetPosition: formData.loyaltyTargetPosition
        };
      default:
        return {};
    }
  };

  const generateRandomPin = () => {
    const length = formData.loyaltyPinLength;
    const isAlpha = formData.loyaltyPinType === 'alphanumeric';
    const chars = isAlpha ? 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' : '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, loyaltyPinValue: result });
  };

  const isLoyaltyFormValid = () => {
    if (!formData.name) return false;
    if (!formData.loyaltyRewardName) return false;

    switch (formData.loyaltyValidationMethod) {
      case 'pin':
        return formData.loyaltyPinValue && formData.loyaltyPinValue.length === formData.loyaltyPinLength;
      case 'icon_single':
      case 'icon_position':
        return !!formData.loyaltyTargetIcon;
      case 'icon_sequence':
        return formData.loyaltyIconSequence && formData.loyaltyIconSequence.length >= 2;
      default:
        return true;
    }
  };

  const totalSteps = formData.type === 'loyalty' ? 3 : 2;

  const campaignTypes = [
    {
      id: 'spin',
      name: 'Spin to Win',
      description: 'Classic prize wheel with customizable segments',
      icon: <FiChevronRight className="transform -rotate-45" />,
      color: 'bg-teal-500',
      hoverBorder: 'hover:border-teal-500'
    },
    {
      id: 'scratch',
      name: 'Scratch to Win',
      description: 'Interactive scratch-off card experience',
      icon: <FiX className="transform rotate-45" />,
      color: 'bg-emerald-500',
      hoverBorder: 'hover:border-emerald-500'
    },
    {
      id: 'bizgamez',
      name: 'BizGamez',
      description: 'External game with webhook integration',
      icon: <span className="font-bold text-white">BG</span>,
      color: 'bg-orange-500',
      hoverBorder: 'hover:border-orange-500'
    },
    {
      id: 'loyalty',
      name: 'Loyalty Program',
      description: 'Digital punch card with staff validation',
      icon: <FiHeart className="text-white" />,
      color: 'bg-rose-500',
      hoverBorder: 'hover:border-rose-500'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-t-2xl md:rounded-xl w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-zinc-900 border-b border-white/10 p-4 md:p-6 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-white">
              Create New Campaign
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const s = i + 1;
              return (
                <div key={s} className="flex-1 flex items-center gap-2">
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                    ${s <= step ? (formData.type === 'loyalty' ? 'bg-rose-500' : 'bg-teal-500') + ' text-white' : 'bg-zinc-700 text-gray-400'}
                  `}>
                    {s}
                  </div>
                  <div className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? (formData.type === 'loyalty' ? 'bg-rose-500' : 'bg-teal-500') : 'bg-zinc-700'}`} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {step === 1 && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-4">
                Select Campaign Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {campaignTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`
                      p-4 md:p-5 rounded-xl text-left md:text-center border-2 border-white/10
                      bg-zinc-800/50 transition-all active:scale-[0.98]
                      ${type.hoverBorder}
                    `}
                  >
                    <div className="flex md:flex-col items-center gap-4 md:gap-3">
                      <div className={`
                        w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl text-white
                        ${type.color}
                      `}>
                        {type.icon}
                      </div>
                      <div className="flex-1 md:flex-none">
                        <h4 className="text-base font-semibold text-white mb-1">
                          {type.name}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {type.description}
                        </p>
                      </div>
                      <FiChevronRight className="w-5 h-5 text-gray-500 md:hidden" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && formData.type && formData.type !== 'bizgamez' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-4">
                Basic Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Campaign Name *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Sale 2026"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Campaign Slug (URL path)
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder={formData.name ? formData.name.toLowerCase().replace(/\s+/g, '-') : 'summer-sale-2026'}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Players will access this at: /play/{formData.slug || 'your-campaign-slug'}
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Play Limit *
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    value={formData.spinLimit}
                    onChange={(e) => setFormData({ ...formData, spinLimit: e.target.value })}
                  >
                    <option value="unlimited">Unlimited plays</option>
                    <option value="one-per-user">One per user</option>
                    <option value="one-per-session">One per session</option>
                    <option value="time-limit">Time limit between plays</option>
                    <option value="calendar-limit">Reset weekly/monthly</option>
                  </select>
                </div>

                {formData.spinLimit === 'time-limit' && (
                  <div>
                    <label className="block mb-2 text-sm text-gray-300">
                      Hours Between Plays
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.spinDelayHours}
                      onChange={(e) => setFormData({ ...formData, spinDelayHours: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                <div className="p-4 bg-zinc-800/50 border border-white/10 rounded-lg">
                  <p className="text-sm text-gray-400">
                    Campaign will inherit <span className="text-white font-medium">{client?.name}'s</span> branding. You can customize all screens, prizes, and settings in the editor after creation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && formData.type === 'bizgamez' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-4">
                BizGamez Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Game Name *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Fossil Creek Title 1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Internal name for this campaign
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    BizGamez Code *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    type="text"
                    value={formData.bizgamezCode || ''}
                    onChange={(e) => setFormData({ ...formData, bizgamezCode: e.target.value })}
                    placeholder="fossil-creek-title-1"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This must match the game_code sent in the webhook from BizGamez/Playzo
                  </p>
                </div>

                <div className="p-4 bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg">
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">How it works:</strong> When a player completes a game in BizGamez/Playzo, the webhook will send their score and contact info to this campaign. You can configure prizes and win/lose outcomes in the editor.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && formData.type === 'loyalty' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-4">
                Loyalty Program Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Program Name *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Coffee Rewards"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm text-gray-300">
                      Program Type
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                      value={formData.loyaltyProgramType}
                      onChange={(e) => setFormData({ ...formData, loyaltyProgramType: e.target.value })}
                    >
                      <option value="visit">Visit-Based</option>
                      <option value="action">Action-Based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm text-gray-300">
                      {formData.loyaltyProgramType === 'visit' ? 'Visits' : 'Actions'} Required
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.loyaltyThreshold}
                      onChange={(e) => setFormData({ ...formData, loyaltyThreshold: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Reward Name *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    type="text"
                    value={formData.loyaltyRewardName}
                    onChange={(e) => setFormData({ ...formData, loyaltyRewardName: e.target.value })}
                    placeholder="Free Coffee"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Reward Description
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 resize-none"
                    rows={2}
                    value={formData.loyaltyRewardDescription}
                    onChange={(e) => setFormData({ ...formData, loyaltyRewardDescription: e.target.value })}
                    placeholder="Get any drink free on your next visit!"
                  />
                </div>

                <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg">
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">How it works:</strong> Customers collect {formData.loyaltyThreshold} stamps by {formData.loyaltyProgramType === 'visit' ? 'visiting your business' : 'completing purchases'}. Staff validates each stamp using a secure verification method you'll configure next.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && formData.type === 'loyalty' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-4">
                Staff Validation Method
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm text-gray-300">
                    Validation Method
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                    value={formData.loyaltyValidationMethod}
                    onChange={(e) => setFormData({ ...formData, loyaltyValidationMethod: e.target.value })}
                  >
                    <option value="pin">PIN Code</option>
                    <option value="icon_single">Icon Selection</option>
                    <option value="icon_sequence">Icon Sequence</option>
                    <option value="icon_position">Icon Position</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.loyaltyValidationMethod === 'pin' && 'Staff enters a secret PIN to confirm'}
                    {formData.loyaltyValidationMethod === 'icon_single' && 'Staff selects the correct icon from a grid'}
                    {formData.loyaltyValidationMethod === 'icon_sequence' && 'Staff selects icons in the correct order'}
                    {formData.loyaltyValidationMethod === 'icon_position' && 'Staff confirms when icon appears in correct position'}
                  </p>
                </div>

                {formData.loyaltyValidationMethod === 'pin' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm text-gray-300">PIN Length</label>
                        <select
                          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                          value={formData.loyaltyPinLength}
                          onChange={(e) => setFormData({ ...formData, loyaltyPinLength: parseInt(e.target.value), loyaltyPinValue: '' })}
                        >
                          {[2, 3, 4, 5, 6].map(n => (
                            <option key={n} value={n}>{n} digits</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm text-gray-300">PIN Type</label>
                        <select
                          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                          value={formData.loyaltyPinType}
                          onChange={(e) => setFormData({ ...formData, loyaltyPinType: e.target.value, loyaltyPinValue: '' })}
                        >
                          <option value="numeric">Numbers only</option>
                          <option value="alphanumeric">Letters & Numbers</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2 text-sm text-gray-300">PIN Value *</label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white text-center tracking-widest font-mono text-lg focus:outline-none focus:border-rose-500"
                          type="text"
                          maxLength={formData.loyaltyPinLength}
                          value={formData.loyaltyPinValue}
                          onChange={(e) => {
                            const val = formData.loyaltyPinType === 'numeric'
                              ? e.target.value.replace(/[^0-9]/g, '')
                              : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setFormData({ ...formData, loyaltyPinValue: val });
                          }}
                          placeholder={'*'.repeat(formData.loyaltyPinLength)}
                        />
                        <button
                          type="button"
                          onClick={generateRandomPin}
                          className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {(formData.loyaltyValidationMethod === 'icon_single' || formData.loyaltyValidationMethod === 'icon_position') && (
                  <div>
                    <label className="block mb-2 text-sm text-gray-300">Select Target Icon</label>
                    <div className="grid grid-cols-8 gap-2">
                      {LOYALTY_ICONS.map((icon) => {
                        const IconComp = icon.icon;
                        const isSelected = formData.loyaltyTargetIcon === icon.id;
                        return (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, loyaltyTargetIcon: icon.id })}
                            className={`
                              p-3 rounded-lg transition-all
                              ${isSelected ? 'bg-rose-500/30 ring-2 ring-rose-500' : 'bg-zinc-800 hover:bg-zinc-700'}
                            `}
                          >
                            <IconComp size={20} style={{ color: isSelected ? icon.color : '#9CA3AF' }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.loyaltyValidationMethod === 'icon_position' && (
                  <div>
                    <label className="block mb-2 text-sm text-gray-300">Target Position</label>
                    <select
                      className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                      value={formData.loyaltyTargetPosition}
                      onChange={(e) => setFormData({ ...formData, loyaltyTargetPosition: e.target.value })}
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                )}

                {formData.loyaltyValidationMethod === 'icon_sequence' && (
                  <div>
                    <label className="block mb-2 text-sm text-gray-300">
                      Select Icons in Order (click to add/remove)
                    </label>
                    <div className="mb-3 p-3 bg-zinc-800/50 rounded-lg min-h-[56px] flex items-center gap-2 flex-wrap">
                      {formData.loyaltyIconSequence.length === 0 ? (
                        <span className="text-gray-500 text-sm">Click icons below to build sequence...</span>
                      ) : (
                        formData.loyaltyIconSequence.map((iconId, idx) => {
                          const icon = getIconById(iconId);
                          if (!icon) return null;
                          const IconComp = icon.icon;
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                                <IconComp size={20} style={{ color: icon.color }} />
                              </div>
                              {idx < formData.loyaltyIconSequence.length - 1 && (
                                <span className="text-gray-500">→</span>
                              )}
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
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => {
                              if (isInSequence) {
                                setFormData({
                                  ...formData,
                                  loyaltyIconSequence: formData.loyaltyIconSequence.filter(id => id !== icon.id)
                                });
                              } else if (formData.loyaltyIconSequence.length < 5) {
                                setFormData({
                                  ...formData,
                                  loyaltyIconSequence: [...formData.loyaltyIconSequence, icon.id]
                                });
                              }
                            }}
                            className={`
                              p-3 rounded-lg transition-all relative
                              ${isInSequence ? 'bg-rose-500/30 ring-2 ring-rose-500' : 'bg-zinc-800 hover:bg-zinc-700'}
                            `}
                          >
                            <IconComp size={20} style={{ color: isInSequence ? icon.color : '#9CA3AF' }} />
                            {isInSequence && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                                {sequenceIndex + 1}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Select 2-5 icons for the sequence</p>
                  </div>
                )}

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-200">
                    <strong>Security:</strong> After 3 failed validation attempts, the customer's card will be locked and require manager override to unlock.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 2 && formData.type !== 'loyalty' && (
          <div className="sticky bottom-0 bg-zinc-900 border-t border-white/10 p-4 md:p-6 flex-shrink-0">
            <div className="flex gap-3">
              <button
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                onClick={() => setStep(1)}
              >
                <FiChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <button
                className={`
                  flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                  ${formData.type === 'bizgamez'
                    ? 'bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50'
                    : 'bg-teal-600 hover:bg-teal-500 disabled:bg-teal-600/50'
                  }
                  text-white disabled:cursor-not-allowed
                `}
                onClick={handleSubmit}
                disabled={formData.type === 'bizgamez' ? !formData.name || !formData.bizgamezCode : !formData.name}
              >
                Create & Open Editor
              </button>
            </div>
          </div>
        )}

        {step === 2 && formData.type === 'loyalty' && (
          <div className="sticky bottom-0 bg-zinc-900 border-t border-white/10 p-4 md:p-6 flex-shrink-0">
            <div className="flex gap-3">
              <button
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                onClick={() => setStep(1)}
              >
                <FiChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <button
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50 text-white disabled:cursor-not-allowed"
                onClick={() => setStep(3)}
                disabled={!formData.name || !formData.loyaltyRewardName}
              >
                Next: Validation Setup
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && formData.type === 'loyalty' && (
          <div className="sticky bottom-0 bg-zinc-900 border-t border-white/10 p-4 md:p-6 flex-shrink-0">
            <div className="flex gap-3">
              <button
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                onClick={() => setStep(2)}
              >
                <FiChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <button
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50 text-white disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={!isLoyaltyFormValid()}
              >
                Create Loyalty Program
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
