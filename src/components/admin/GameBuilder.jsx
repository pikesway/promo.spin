import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import GameSettings from './builder/GameSettings';
import VisualCustomizer from './builder/VisualCustomizer';
import ScreenEditor from './builder/ScreenEditor';
import GamePreview from './builder/GamePreview';
import SafeIcon from '../../common/SafeIcon';
import GlassCard from '../../common/GlassCard';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiSettings, FiPalette, FiMonitor, FiEye, FiSave } = FiIcons;

const GameBuilder = ({ game, onBack }) => {
  const { updateGame } = useGame();
  const [activeTab, setActiveTab] = useState('settings');
  const [gameData, setGameData] = useState(game);

  const handleSave = () => {
    updateGame(game.id, gameData);
    alert('Campaign saved!');
  };

  const handleGameDataChange = (updates) => {
    const newData = { ...gameData, ...updates };
    setGameData(newData);
    // Auto-save logic could go here
  };

  const tabs = [
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'visual', label: 'Design', icon: FiPalette },
    { id: 'screens', label: 'Screens', icon: FiMonitor },
    { id: 'preview', label: 'Preview', icon: FiEye }
  ];

  return (
    <div className="h-full flex flex-col bg-charcoal-900 text-white">
      {/* Builder Header */}
      <header className="h-16 border-b border-white/10 bg-charcoal-800 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">{gameData.name}</h1>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs text-gray-500">Changes unsaved</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
        >
          <SafeIcon icon={FiSave} className="w-4 h-4" />
          <span>Save</span>
        </button>
      </header>

      {/* Builder Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-20 md:w-64 border-r border-white/5 bg-charcoal-800/50 flex flex-col">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center md:space-x-3 p-4 md:px-6 hover:bg-white/5 transition-colors border-l-2
                ${activeTab === tab.id ? 'border-indigo-500 bg-white/5 text-indigo-400' : 'border-transparent text-gray-500'}
              `}
            >
              <SafeIcon icon={tab.icon} className="w-5 h-5" />
              <span className="hidden md:block font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Panel */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-charcoal-900 admin-scroll">
          <div className="max-w-4xl mx-auto premium-admin-wrapper">
             {/* 
                The sub-components (GameSettings, etc.) will inherit the dark mode styles 
                defined in index.css via the .premium-admin-wrapper class 
             */}
            {activeTab === 'settings' && <GameSettings gameData={gameData} onChange={handleGameDataChange} />}
            {activeTab === 'visual' && <VisualCustomizer gameData={gameData} onChange={handleGameDataChange} />}
            {activeTab === 'screens' && <ScreenEditor gameData={gameData} onChange={handleGameDataChange} />}
            {activeTab === 'preview' && <GamePreview gameData={gameData} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default GameBuilder;