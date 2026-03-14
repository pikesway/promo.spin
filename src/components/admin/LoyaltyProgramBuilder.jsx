import React, { useState, useEffect } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import LoyaltySettings from './builder/LoyaltySettings';
import LoyaltyDesign from './builder/LoyaltyDesign';
import LoyaltyScreens from './builder/LoyaltyScreens';
import LoyaltyPreview from './builder/LoyaltyPreview';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiSettings, FiLayout, FiMonitor, FiEye, FiSave, FiCheck } = FiIcons;

const LoyaltyProgramBuilder = ({ campaign, client, onBack }) => {
  const { updateCampaign } = usePlatform();
  const [activeTab, setActiveTab] = useState('settings');
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const config = campaign.config || {};
    const loyalty = config.loyalty || {};

    setLoyaltyData({
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      programType: loyalty.programType || 'visit',
      threshold: loyalty.threshold || 10,
      rewardName: loyalty.rewardName || 'Free Reward',
      rewardDescription: loyalty.rewardDescription || '',
      validationMethod: loyalty.validationMethod || 'pin',
      validationConfig: loyalty.validationConfig || { pin: '1234' },
      lockoutThreshold: loyalty.lockoutThreshold || 3,
      resetBehavior: loyalty.resetBehavior || 'reset',
      settings: {
        timezone: config.settings?.timezone || 'UTC',
        startDate: config.settings?.startDate || '',
        endDate: config.settings?.endDate || '',
      },
      card: {
        primaryColor: loyalty.card?.primaryColor || client?.primary_color || '#F59E0B',
        backgroundColor: loyalty.card?.backgroundColor || client?.background_color || '#18181B',
        stampIcon: loyalty.card?.stampIcon || 'star',
        customIconUrl: loyalty.card?.customIconUrl || '',
        stampFilledColor: loyalty.card?.stampFilledColor || '#FFFFFF',
        stampEmptyColor: loyalty.card?.stampEmptyColor || 'rgba(255,255,255,0.2)',
        layout: loyalty.card?.layout || 'grid',
        showLogo: loyalty.card?.showLogo !== false,
        showQR: loyalty.card?.showQR !== false,
      },
      screens: {
        enrollment: {
          enabled: config.screens?.enrollment?.enabled !== false,
          headline: config.screens?.enrollment?.headline || 'Join Our Rewards Program',
          subheadline: config.screens?.enrollment?.subheadline || 'Earn stamps with every visit and get rewarded!',
          buttonText: config.screens?.enrollment?.buttonText || 'Sign Up Now',
          collectPhone: config.screens?.enrollment?.collectPhone !== false,
          collectEmail: config.screens?.enrollment?.collectEmail !== false,
          backgroundImage: config.screens?.enrollment?.backgroundImage || '',
        },
        reward: {
          headline: config.screens?.reward?.headline || 'Congratulations!',
          subheadline: config.screens?.reward?.subheadline || 'You\'ve earned your reward!',
          buttonText: config.screens?.reward?.buttonText || 'Claim Reward',
          expiryDays: config.screens?.reward?.expiryDays || 30,
          backgroundImage: config.screens?.reward?.backgroundImage || '',
        }
      }
    });
  }, [campaign, client]);

  const handleSave = async () => {
    if (!loyaltyData) return;

    setIsSaving(true);
    try {
      const updates = {
        name: loyaltyData.name,
        config: {
          ...campaign.config,
          loyalty: {
            programType: loyaltyData.programType,
            threshold: loyaltyData.threshold,
            rewardName: loyaltyData.rewardName,
            rewardDescription: loyaltyData.rewardDescription,
            validationMethod: loyaltyData.validationMethod,
            validationConfig: loyaltyData.validationConfig,
            lockoutThreshold: loyaltyData.lockoutThreshold,
            resetBehavior: loyaltyData.resetBehavior,
            card: loyaltyData.card,
          },
          settings: loyaltyData.settings,
          screens: loyaltyData.screens,
        }
      };

      await updateCampaign(campaign.id, updates);
      setHasChanges(false);
      alert('Loyalty program saved!');
    } catch (error) {
      console.error('Error saving loyalty program:', error);
      alert('Failed to save loyalty program');
    }
    setIsSaving(false);
  };

  const handleDataChange = (updates) => {
    setLoyaltyData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const loyaltyUrl = `${window.location.origin}${window.location.pathname}#/loyalty/${campaign.slug}`;

  const tabs = [
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'design', label: 'Card Design', icon: FiLayout },
    { id: 'screens', label: 'Screens', icon: FiMonitor },
    { id: 'preview', label: 'Preview', icon: FiEye }
  ];

  if (!loyaltyData) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading loyalty program...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-full transition-colors flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{loyaltyData.name}</h1>
            <div className="hidden md:flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasChanges ? 'bg-amber-500' : 'bg-green-500'}`}></span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {hasChanges ? 'Changes unsaved' : 'All changes saved'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="hidden md:flex px-6 py-2 rounded-lg font-medium items-center gap-2 shadow-lg transition-colors"
          style={{
            background: hasChanges && !isSaving ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
            color: '#fff',
            opacity: hasChanges && !isSaving ? 1 : 0.5,
            cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed'
          }}
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
        <nav className="hidden md:flex w-64 flex-col" style={{ borderRight: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-3 p-4 px-6 transition-colors border-l-2"
              style={{
                borderLeftColor: activeTab === tab.id ? 'var(--brand-primary)' : 'transparent',
                background: activeTab === tab.id ? 'var(--btn-ghost-hover)' : 'transparent',
                color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-tertiary)'
              }}
            >
              <SafeIcon icon={tab.icon} className="w-5 h-5" />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8" style={{ background: 'var(--bg-primary)' }}>
          <div className="max-w-4xl mx-auto">
            {activeTab === 'settings' && (
              <LoyaltySettings
                loyaltyData={loyaltyData}
                onChange={handleDataChange}
                loyaltyUrl={loyaltyUrl}
              />
            )}
            {activeTab === 'design' && (
              <LoyaltyDesign
                loyaltyData={loyaltyData}
                onChange={handleDataChange}
                client={client}
              />
            )}
            {activeTab === 'screens' && (
              <LoyaltyScreens
                loyaltyData={loyaltyData}
                onChange={handleDataChange}
              />
            )}
            {activeTab === 'preview' && (
              <LoyaltyPreview
                loyaltyData={loyaltyData}
                client={client}
                loyaltyUrl={loyaltyUrl}
              />
            )}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex safe-area-bottom" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-tertiary)'
            }}
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
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 z-20"
          style={{
            background: isSaving ? 'var(--bg-tertiary)' : 'var(--brand-primary)',
            opacity: isSaving ? 0.5 : 1
          }}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
          ) : (
            <SafeIcon icon={FiCheck} className="w-6 h-6" />
          )}
        </button>
      )}
    </div>
  );
};

export default LoyaltyProgramBuilder;