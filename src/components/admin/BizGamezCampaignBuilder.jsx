import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiSettings, FiLink, FiGift, FiSave, FiPlus, FiTrash2, FiCopy, FiCheck } from 'react-icons/fi';
import { usePlatform } from '../../context/PlatformContext';
import GlassCard from '../common/GlassCard';
import ImageUploader from '../../common/ImageUploader';

const BizGamezCampaignBuilder = ({ campaign, client, onBack }) => {
  const { updateCampaign } = usePlatform();
  const [activeTab, setActiveTab] = useState('settings');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    bizgamez_code: '',
    game_url: '',
    qr_code_image: '',
    embed_code: '',
    prizes: [],
    redemption: { expirationDays: 30 }
  });

  useEffect(() => {
    if (campaign?.config) {
      setConfig({
        bizgamez_code: campaign.config.bizgamez_code || '',
        game_url: campaign.config.game_url || '',
        qr_code_image: campaign.config.qr_code_image || '',
        embed_code: campaign.config.embed_code || '',
        prizes: campaign.config.prizes || [],
        redemption: campaign.config.redemption || { expirationDays: 30 }
      });
    }
  }, [campaign]);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handlePrizeChange = (index, key, value) => {
    const newPrizes = [...config.prizes];
    newPrizes[index] = { ...newPrizes[index], [key]: value };
    setConfig(prev => ({ ...prev, prizes: newPrizes }));
    setHasChanges(true);
  };

  const addPrize = () => {
    const newPrize = {
      score: config.prizes.length,
      name: 'New Prize',
      isWin: true,
      winHeadline: 'You Won!',
      winMessage: 'Congratulations!'
    };
    setConfig(prev => ({ ...prev, prizes: [...prev.prizes, newPrize] }));
    setHasChanges(true);
  };

  const removePrize = (index) => {
    const newPrizes = config.prizes.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, prizes: newPrizes }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCampaign(campaign.id, { config });
      setHasChanges(false);
      alert('Campaign saved!');
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    }
    setIsSaving(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bizgamez-webhook`;

  const tabs = [
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'sharing', label: 'Sharing', icon: FiLink },
    { id: 'prizes', label: 'Prizes', icon: FiGift }
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      <header className="h-14 md:h-16 border-b border-white/10 bg-zinc-800 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white truncate">{campaign.name}</h1>
            <div className="hidden md:flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                BizGamez
              </span>
              <span className={`w-2 h-2 rounded-full ${hasChanges ? 'bg-amber-500' : 'bg-green-500'}`}></span>
              <span className="text-xs text-gray-500">
                {hasChanges ? 'Changes unsaved' : 'All changes saved'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="hidden md:flex bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium items-center gap-2 shadow-lg shadow-orange-500/20 transition-colors"
        >
          <FiSave className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        {hasChanges && (
          <div className="md:hidden flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-xs text-amber-400">Unsaved</span>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <nav className="hidden md:flex w-64 border-r border-white/5 bg-zinc-800/50 flex-col">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-3 p-4 px-6 hover:bg-white/5 transition-colors border-l-2
                ${activeTab === tab.id ? 'border-orange-500 bg-white/5 text-orange-400' : 'border-transparent text-gray-500'}
              `}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-900 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'settings' && (
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-lg md:text-xl font-bold text-white">Campaign Settings</h2>

                <GlassCard className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4">Basic Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Game Name
                      </label>
                      <input
                        type="text"
                        value={campaign.name}
                        disabled
                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">Campaign name cannot be changed here</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        BizGamez Code *
                      </label>
                      <input
                        type="text"
                        value={config.bizgamez_code}
                        onChange={(e) => handleConfigChange('bizgamez_code', e.target.value)}
                        placeholder="fossil-creek-title-1"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This must match the game_code field sent in the webhook
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4">Webhook Configuration</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Webhook Endpoint URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={webhookUrl}
                          readOnly
                          className="flex-1 bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-gray-300 font-mono text-xs md:text-sm overflow-x-auto"
                        />
                        <button
                          onClick={() => copyToClipboard(webhookUrl)}
                          className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                        >
                          <FiCopy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Configure BizGamez/Playzo to send webhooks to this URL
                      </p>
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-4 border border-white/10 overflow-x-auto">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Expected Webhook Payload</h4>
                      <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
{`{
  "score": 1,
  "game_code": "${config.bizgamez_code || 'your-game-code'}",
  "name": "Player Name",
  "mobile": "1234567890",
  "email": "player@email.com",
  "created_at": "2026-01-21 14:43:52"
}`}
                      </pre>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4">Redemption Settings</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Prize Expiration (Days)
                    </label>
                    <input
                      type="number"
                      value={config.redemption?.expirationDays || 30}
                      onChange={(e) => handleConfigChange('redemption', { ...config.redemption, expirationDays: parseInt(e.target.value) })}
                      min="1"
                      max="365"
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      How many days until the prize redemption code expires
                    </p>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'sharing' && (
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-lg md:text-xl font-bold text-white">Game URL & Sharing</h2>

                <GlassCard className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4">Public Game URL</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Game URL
                    </label>
                    <input
                      type="url"
                      value={config.game_url}
                      onChange={(e) => handleConfigChange('game_url', e.target.value)}
                      placeholder="https://games.playzo.io/games/fossil-creek-title-1"
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The public URL where players can access this game
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4">QR Code</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      QR Code Image
                    </label>
                    <ImageUploader
                      value={config.qr_code_image}
                      onChange={(url) => handleConfigChange('qr_code_image', url)}
                      placeholder="Upload or paste QR code image URL"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload the QR code image for this game
                    </p>
                  </div>

                  {config.qr_code_image && (
                    <div className="mt-4 flex justify-center">
                      <div className="bg-white p-4 rounded-lg">
                        <img
                          src={config.qr_code_image}
                          alt="QR Code"
                          className="w-40 h-40 md:w-48 md:h-48 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </GlassCard>

                <GlassCard className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4">Embed Code</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      iFrame Embed Code
                    </label>
                    <textarea
                      value={config.embed_code}
                      onChange={(e) => handleConfigChange('embed_code', e.target.value)}
                      placeholder='<iframe src="https://games.playzo.io/embed/fossil-creek" width="100%" height="600" frameborder="0"></iframe>'
                      rows={4}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-orange-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste the iFrame embed code provided by BizGamez/Playzo
                    </p>
                  </div>

                  {config.embed_code && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => copyToClipboard(config.embed_code)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                      >
                        <FiCopy className="w-4 h-4" />
                        Copy Embed Code
                      </button>
                    </div>
                  )}
                </GlassCard>
              </div>
            )}

            {activeTab === 'prizes' && (
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h2 className="text-lg md:text-xl font-bold text-white">Prize Configuration</h2>
                  <button
                    onClick={addPrize}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors text-sm font-medium w-full sm:w-auto justify-center"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Prize
                  </button>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-sm text-orange-200">
                    <strong>Score Matching:</strong> Each prize is tied to a specific score value. When the webhook sends a score,
                    it will be matched to the prize with that exact score value.
                  </p>
                </div>

                {config.prizes.length === 0 ? (
                  <GlassCard className="p-8 text-center">
                    <FiGift className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Prizes Configured</h3>
                    <p className="text-gray-400 mb-4">Add prizes that players can win based on their game score</p>
                    <button
                      onClick={addPrize}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors text-sm font-medium"
                    >
                      Add First Prize
                    </button>
                  </GlassCard>
                ) : (
                  <div className="space-y-4">
                    {config.prizes.map((prize, index) => (
                      <GlassCard key={index} className="p-4 md:p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${prize.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {prize.isWin ? 'WIN' : 'LOSE'}
                            </span>
                            <h3 className="text-base md:text-lg font-semibold text-white">{prize.name || 'Unnamed Prize'}</h3>
                          </div>
                          <button
                            onClick={() => removePrize(index)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              BizGamez Score *
                            </label>
                            <input
                              type="number"
                              value={prize.score}
                              onChange={(e) => handlePrizeChange(index, 'score', parseInt(e.target.value))}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">Score value from webhook</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Prize Name *
                            </label>
                            <input
                              type="text"
                              value={prize.name}
                              onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                              placeholder="Grand Prize"
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Win/Lose
                            </label>
                            <select
                              value={prize.isWin ? 'win' : 'lose'}
                              onChange={(e) => handlePrizeChange(index, 'isWin', e.target.value === 'win')}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                            >
                              <option value="win">Win - Player receives prize</option>
                              <option value="lose">Lose - No prize awarded</option>
                            </select>
                          </div>

                          {prize.isWin && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Win Screen Headline
                                </label>
                                <input
                                  type="text"
                                  value={prize.winHeadline || ''}
                                  onChange={(e) => handlePrizeChange(index, 'winHeadline', e.target.value)}
                                  placeholder="You Won!"
                                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Win Screen Message
                                </label>
                                <textarea
                                  value={prize.winMessage || ''}
                                  onChange={(e) => handlePrizeChange(index, 'winMessage', e.target.value)}
                                  placeholder="Congratulations on winning the grand prize!"
                                  rows={2}
                                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 flex safe-area-bottom">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex flex-col items-center gap-1 py-3 transition-colors
              ${activeTab === tab.id ? 'text-orange-400' : 'text-gray-500'}
            `}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center transition-all active:scale-95 z-20"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <FiCheck className="w-6 h-6" />
          )}
        </button>
      )}
    </div>
  );
};

export default BizGamezCampaignBuilder;
