import React, { useState } from 'react';
import StartScreenEditor from './screens/StartScreenEditor';
import GameScreenEditor from './screens/GameScreenEditor';
import WinScreenEditor from './screens/WinScreenEditor';
import LoseScreenEditor from './screens/LoseScreenEditor';
import LeadCaptureScreenEditor from './screens/LeadCaptureScreenEditor';
import ThankYouScreenEditor from './screens/ThankYouScreenEditor';
import RedemptionSettings from './screens/RedemptionSettings';

const ScreenEditor = ({ gameData, onChange }) => {
  const [activeScreen, setActiveScreen] = useState('start');

  const screens = [
    { id: 'start', label: 'Start Screen', enabled: gameData.screens?.start?.enabled },
    { id: 'game', label: 'Game Screen', enabled: gameData.screens?.game?.enabled },
    { id: 'win', label: 'Win Screen', enabled: gameData.screens?.win?.enabled },
    { id: 'lose', label: 'Lose Screen', enabled: gameData.screens?.lose?.enabled },
    { id: 'leadCapture', label: 'Lead Capture', enabled: gameData.screens?.leadCapture?.enabled },
    { id: 'redemption', label: 'Redemption System', enabled: gameData.screens?.redemption?.enabled },
    { id: 'thankYou', label: 'Thank You Screen', enabled: gameData.screens?.thankYou?.enabled }
  ];

  const handleScreenChange = (screenId, updates) => {
    onChange({
      ...gameData,
      screens: {
        ...gameData.screens,
        [screenId]: {
          ...gameData.screens?.[screenId],
          ...updates
        }
      }
    });
  };

  const toggleScreenEnabled = (screenId) => {
    const currentEnabled = gameData.screens?.[screenId]?.enabled || false;
    handleScreenChange(screenId, { enabled: !currentEnabled });
  };

  return (
    <div className="space-y-6">
      <div className="bg-charcoal-800 rounded-lg border border-white/10">
        <div className="border-b border-white/10 overflow-x-auto">
          <nav className="flex space-x-1 px-6 min-w-max">
            {screens.map(screen => (
              <button
                key={screen.id}
                onClick={() => setActiveScreen(screen.id)}
                className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                  activeScreen === screen.id
                    ? 'border-teal-500 text-teal-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${screen.enabled ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>{screen.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">
              {screens.find(s => s.id === activeScreen)?.label}
            </h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={gameData.screens?.[activeScreen]?.enabled || false}
                onChange={() => toggleScreenEnabled(activeScreen)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-300">Enable this screen</span>
            </label>
          </div>

          {gameData.screens?.[activeScreen]?.enabled ? (
            <>
              {activeScreen === 'start' && (
                <StartScreenEditor screenData={gameData.screens?.start || {}} onChange={(updates) => handleScreenChange('start', updates)} />
              )}
              {activeScreen === 'game' && (
                <GameScreenEditor screenData={gameData.screens?.game || {}} onChange={(updates) => handleScreenChange('game', updates)} />
              )}
              {activeScreen === 'win' && (
                <WinScreenEditor screenData={gameData.screens?.win || {}} onChange={(updates) => handleScreenChange('win', updates)} />
              )}
              {activeScreen === 'lose' && (
                <LoseScreenEditor screenData={gameData.screens?.lose || {}} onChange={(updates) => handleScreenChange('lose', updates)} />
              )}
              {activeScreen === 'leadCapture' && (
                <LeadCaptureScreenEditor screenData={gameData.screens?.leadCapture || {}} onChange={(updates) => handleScreenChange('leadCapture', updates)} />
              )}
              {activeScreen === 'redemption' && (
                <RedemptionSettings screenData={gameData.screens?.redemption || {}} onChange={(updates) => handleScreenChange('redemption', updates)} />
              )}
              {activeScreen === 'thankYou' && (
                 <ThankYouScreenEditor screenData={gameData.screens?.thankYou || {}} onChange={(updates) => handleScreenChange('thankYou', updates)} />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>This screen is currently disabled. Enable it to configure its settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenEditor;