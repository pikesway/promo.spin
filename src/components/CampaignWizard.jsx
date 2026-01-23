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
            {[1, 2].map(s => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                  ${s <= step ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-gray-400'}
                `}>
                  {s}
                </div>
                <div className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-teal-500' : 'bg-zinc-700'}`} />
              </div>
            ))}
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
        </div>

        {step === 2 && (
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
      </div>
    </div>
  );
}
