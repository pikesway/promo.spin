import React, { useState } from 'react';
import { FiCheck, FiGift, FiUserPlus } from 'react-icons/fi';

const LoyaltyScreens = ({ loyaltyData, onChange }) => {
  const [activeScreen, setActiveScreen] = useState('enrollment');

  const handleScreenChange = (screenKey, field, value) => {
    onChange({
      screens: {
        ...loyaltyData.screens,
        [screenKey]: {
          ...loyaltyData.screens[screenKey],
          [field]: value
        }
      }
    });
  };

  const screens = [
    { id: 'enrollment', label: 'Enrollment', icon: FiUserPlus },
    { id: 'reward', label: 'Reward Unlocked', icon: FiGift },
  ];

  return (
    <div className="space-y-6">
      <div className="theme-bg-secondary rounded-lg border theme-border">
        <div className="border-b theme-border overflow-x-auto">
          <nav className="flex space-x-1 px-4 min-w-max">
            {screens.map(screen => {
              const IconComponent = screen.icon;
              return (
                <button
                  key={screen.id}
                  onClick={() => setActiveScreen(screen.id)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeScreen === screen.id
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent theme-text-tertiary hover:theme-text-secondary'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {screen.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeScreen === 'enrollment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium theme-text-primary">Enrollment Screen</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loyaltyData.screens.enrollment.enabled}
                    onChange={(e) => handleScreenChange('enrollment', 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-sm theme-text-secondary">Enable enrollment</span>
                </label>
              </div>

              {loyaltyData.screens.enrollment.enabled ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Headline
                    </label>
                    <input
                      type="text"
                      value={loyaltyData.screens.enrollment.headline}
                      onChange={(e) => handleScreenChange('enrollment', 'headline', e.target.value)}
                      placeholder="Join Our Rewards Program"
                      className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Subheadline
                    </label>
                    <textarea
                      value={loyaltyData.screens.enrollment.subheadline}
                      onChange={(e) => handleScreenChange('enrollment', 'subheadline', e.target.value)}
                      placeholder="Earn stamps with every visit and get rewarded!"
                      rows={2}
                      className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Sign Up Button Text
                    </label>
                    <input
                      type="text"
                      value={loyaltyData.screens.enrollment.buttonText}
                      onChange={(e) => handleScreenChange('enrollment', 'buttonText', e.target.value)}
                      placeholder="Sign Up Now"
                      className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-3">
                      Information to Collect
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          className="w-4 h-4 rounded border-white/20 text-rose-500"
                        />
                        <span className="text-sm theme-text-tertiary">Name (required)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loyaltyData.screens.enrollment.collectEmail}
                          onChange={(e) => handleScreenChange('enrollment', 'collectEmail', e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="text-sm theme-text-secondary">Email address</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loyaltyData.screens.enrollment.collectPhone}
                          onChange={(e) => handleScreenChange('enrollment', 'collectPhone', e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="text-sm theme-text-secondary">Phone number</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                      Background Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={loyaltyData.screens.enrollment.backgroundImage}
                      onChange={(e) => handleScreenChange('enrollment', 'backgroundImage', e.target.value)}
                      placeholder="https://images.pexels.com/..."
                      className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
                    />
                    <p className="text-xs theme-text-tertiary mt-1">
                      Leave empty to use the card background color.
                    </p>
                  </div>

                  <div className="p-4 theme-bg-tertiary rounded-lg border theme-border">
                    <h4 className="text-sm font-medium theme-text-primary mb-3">Preview</h4>
                    <div
                      className="rounded-lg p-6 text-center"
                      style={{
                        backgroundColor: loyaltyData.card.backgroundColor,
                        backgroundImage: loyaltyData.screens.enrollment.backgroundImage
                          ? `url(${loyaltyData.screens.enrollment.backgroundImage})`
                          : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div className="backdrop-blur-sm bg-black/30 rounded-lg p-4">
                        <h2 className="text-xl font-bold theme-text-primary mb-2">
                          {loyaltyData.screens.enrollment.headline || 'Join Our Rewards Program'}
                        </h2>
                        <p className="text-sm theme-text-secondary mb-4">
                          {loyaltyData.screens.enrollment.subheadline || 'Earn stamps with every visit!'}
                        </p>
                        <button
                          className="px-6 py-2 rounded-lg theme-text-primary font-medium"
                          style={{ backgroundColor: loyaltyData.card.primaryColor }}
                        >
                          {loyaltyData.screens.enrollment.buttonText || 'Sign Up Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 theme-bg-tertiary rounded-lg border theme-border text-center">
                  <p className="theme-text-tertiary">
                    Enrollment is disabled. Members will need to be added manually.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeScreen === 'reward' && (
            <div className="space-y-6">
              <h3 className="text-base font-medium theme-text-primary">Reward Unlocked Screen</h3>
              <p className="text-sm theme-text-tertiary">
                Shown when a customer completes their card and earns their reward.
              </p>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Headline
                </label>
                <input
                  type="text"
                  value={loyaltyData.screens.reward.headline}
                  onChange={(e) => handleScreenChange('reward', 'headline', e.target.value)}
                  placeholder="Congratulations!"
                  className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Subheadline
                </label>
                <textarea
                  value={loyaltyData.screens.reward.subheadline}
                  onChange={(e) => handleScreenChange('reward', 'subheadline', e.target.value)}
                  placeholder="You've earned your reward!"
                  rows={2}
                  className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Claim Button Text
                </label>
                <input
                  type="text"
                  value={loyaltyData.screens.reward.buttonText}
                  onChange={(e) => handleScreenChange('reward', 'buttonText', e.target.value)}
                  placeholder="Claim Reward"
                  className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Reward Expiry
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={loyaltyData.screens.reward.expiryDays}
                    onChange={(e) => handleScreenChange('reward', 'expiryDays', parseInt(e.target.value) || 30)}
                    className="w-24 theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
                  />
                  <span className="text-sm theme-text-tertiary">days after earning</span>
                </div>
                <p className="text-xs theme-text-tertiary mt-1">
                  The reward code will expire after this many days.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Background Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={loyaltyData.screens.reward.backgroundImage}
                  onChange={(e) => handleScreenChange('reward', 'backgroundImage', e.target.value)}
                  placeholder="https://images.pexels.com/..."
                  className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
                />
              </div>

              <div className="p-4 theme-bg-tertiary rounded-lg border theme-border">
                <h4 className="text-sm font-medium theme-text-primary mb-3">Preview</h4>
                <div
                  className="rounded-lg p-6 text-center"
                  style={{
                    backgroundColor: loyaltyData.card.primaryColor,
                    backgroundImage: loyaltyData.screens.reward.backgroundImage
                      ? `url(${loyaltyData.screens.reward.backgroundImage})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="backdrop-blur-sm bg-black/20 rounded-lg p-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                      <FiGift className="w-8 h-8 theme-text-primary" />
                    </div>
                    <h2 className="text-xl font-bold theme-text-primary mb-2">
                      {loyaltyData.screens.reward.headline || 'Congratulations!'}
                    </h2>
                    <p className="text-sm theme-text-primary/80 mb-4">
                      {loyaltyData.screens.reward.subheadline || "You've earned your reward!"}
                    </p>
                    <div className="bg-white/10 backdrop-blur rounded-lg p-3 mb-4">
                      <p className="text-lg font-bold theme-text-primary">{loyaltyData.rewardName}</p>
                      {loyaltyData.rewardDescription && (
                        <p className="text-sm theme-text-primary/70">{loyaltyData.rewardDescription}</p>
                      )}
                    </div>
                    <button
                      className="px-6 py-2 rounded-lg bg-white text-gray-900 font-medium"
                    >
                      {loyaltyData.screens.reward.buttonText || 'Claim Reward'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyScreens;
