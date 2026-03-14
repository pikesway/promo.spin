import React, { useState, useEffect } from 'react';
import SafeIcon from '../../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
const { FiClock } = FiIcons;

const StartScreen = ({ game, onNext, hasSpun, nextSpinTime }) => {
  const screenData = game.screens?.start || {};
  const fonts = game.visual?.fonts || {};
  const [timeLeft, setTimeLeft] = useState('');

  // Resolve button style
  const globalButton = game.visual?.buttons || {};
  const buttonStyle = {
    fontFamily: fonts.primary,
    backgroundColor: (screenData.useCustomButtonColor ? screenData.buttonColor : globalButton.backgroundColor) || '#2563eb',
    color: (screenData.useCustomButtonColor ? screenData.buttonTextColor : globalButton.textColor) || '#ffffff',
  };

  useEffect(() => {
    if (nextSpinTime) {
      const timer = setInterval(() => {
        const now = new Date();
        const diff = nextSpinTime - now;

        if (diff <= 0) {
          setTimeLeft('Ready to spin!');
          clearInterval(timer);
          // Ideally trigger a refresh in parent, but reloading page handles it for now
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [nextSpinTime]);

  if (hasSpun) {
    const isOnePerUser = game.settings?.spinLimit === 'one-per-user';
    const isTimeLimit = game.settings?.spinLimit === 'time-limit';

    if (isOnePerUser || (isTimeLimit && nextSpinTime)) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 text-center max-w-md w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: fonts.primary }}>
              Already Played
            </h1>

            {isOnePerUser && (
              <p className="text-gray-600 mb-6" style={{ fontFamily: fonts.secondary }}>
                You have already played this game. Thank you for participating!
              </p>
            )}

            {isTimeLimit && nextSpinTime && (
              <div className="mb-6">
                <p className="text-gray-600 mb-4" style={{ fontFamily: fonts.secondary }}>
                  You've used your spin for now. Come back later!
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 inline-block">
                  <div className="flex items-center justify-center text-blue-600 mb-1">
                    <SafeIcon icon={FiClock} className="w-5 h-5 mr-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Next Spin In</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-800 font-mono">
                    {timeLeft || '...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 text-center max-w-md w-full">
        {screenData.logo && (
          <img
            src={screenData.logo}
            alt="Logo"
            className="mx-auto mb-6 max-h-20 object-contain"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}
        <h1 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: fonts.primary }}>
          {screenData.headline || 'Spin to Win!'}
        </h1>
        <p className="text-gray-600 mb-6" style={{ fontFamily: fonts.secondary }}>
          {screenData.subheading || 'Try your luck and win amazing prizes'}
        </p>

        {screenData.rulesText && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700" style={{ fontFamily: fonts.secondary }}>
              {screenData.rulesText}
            </p>
          </div>
        )}

        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg font-semibold text-lg transition-transform hover:-translate-y-0.5 w-full shadow-md"
          style={buttonStyle}
        >
          {screenData.buttonText || 'Start Game'}
        </button>
      </div>
    </div>
  );
};

export default StartScreen;