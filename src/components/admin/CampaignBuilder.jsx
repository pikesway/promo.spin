import React, { useState, useEffect } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { campaignToGame, gameDataToCampaignUpdates } from '../../utils/campaignAdapter';
import GameSettings from './builder/GameSettings';
import VisualCustomizer from './builder/VisualCustomizer';
import ScreenEditor from './builder/ScreenEditor';
import GamePreview from './builder/GamePreview';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiSettings, FiLayout, FiMonitor, FiEye, FiSave, FiCheck } = FiIcons;

const CampaignBuilder = ({ campaign, client, onBack }) => {
  const { updateCampaign } = usePlatform();
  const [activeTab, setActiveTab] = useState('settings');
  const [gameData, setGameData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const converted = campaignToGame(campaign, client);
    setGameData(converted);
  }, [campaign, client]);

  const handleSave = async () => {
    if (!gameData) return;

    setIsSaving(true);
    try {
      const updates = gameDataToCampaignUpdates(gameData, campaign);
      await updateCampaign(campaign.id, updates);
      setHasChanges(false);
      alert('Campaign saved!');
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    }
    setIsSaving(false);
  };

  const handleGameDataChange = (updates) => {
    const newData = { ...gameData, ...updates };
    setGameData(newData);
    setHasChanges(true);
  };

  const campaignUrl = `${window.location.origin}${window.location.pathname}#/play/${campaign.slug}`;

  const tabs = [
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'visual', label: 'Design', icon: FiLayout },
    { id: 'screens', label: 'Screens', icon: FiMonitor },
    { id: 'preview', label: 'Preview', icon: FiEye }
  ];

  if (!gameData) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900 text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      <header className="h-14 md:h-16 border-b border-white/10 bg-zinc-800 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white truncate">{gameData.name}</h1>
            <div className="hidden md:flex items-center gap-2">
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
          className="hidden md:flex bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium items-center gap-2 shadow-lg shadow-teal-500/20 transition-colors"
        >
          <SafeIcon icon={FiSave} className="w-4 h-4" />
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
                ${activeTab === tab.id ? 'border-teal-500 bg-white/5 text-teal-400' : 'border-transparent text-gray-500'}
              `}
            >
              <SafeIcon icon={tab.icon} className="w-5 h-5" />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-900 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'settings' && (
              <GameSettings
                gameData={gameData}
                onChange={handleGameDataChange}
                customUrl={campaignUrl}
                idLabel="Campaign ID"
              />
            )}
            {activeTab === 'visual' && (
              <VisualCustomizer
                gameData={gameData}
                onChange={handleGameDataChange}
              />
            )}
            {activeTab === 'screens' && (
              <ScreenEditor
                gameData={gameData}
                onChange={handleGameDataChange}
              />
            )}
            {activeTab === 'preview' && (
              <GamePreview
                gameData={gameData}
                playUrl={campaignUrl}
                embedUrl={campaignUrl}
                isCampaign={true}
                campaignSlug={campaign.slug}
              />
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
              ${activeTab === tab.id ? 'text-teal-400' : 'text-gray-500'}
            `}
          >
            <SafeIcon icon={tab.icon} className="w-5 h-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-600/50 text-white rounded-full shadow-lg shadow-teal-500/30 flex items-center justify-center transition-all active:scale-95 z-20"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <SafeIcon icon={FiCheck} className="w-6 h-6" />
          )}
        </button>
      )}
    </div>
  );
};

export default CampaignBuilder;
