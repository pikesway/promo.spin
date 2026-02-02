import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import GameList from './GameList';
import GameBuilder from './GameBuilder';
import LeadReporting from './LeadReporting';
import RedemptionLog from './RedemptionLog';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiPlus, FiGrid, FiBarChart2, FiGift, FiLogOut } = FiIcons;

const AdminDashboard = () => {
  const { createGame, isLocalMode } = useGame();
  const [activeTab, setActiveTab] = useState('games');
  const [selectedGame, setSelectedGame] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const handleCreateGame = () => {
    const defaultGame = {
      name: 'New Spin Game',
      is_active: true,
      settings: { spinLimit: 'one-per-user', passwordProtected: false, password: '' },
      visual: {
        background: { type: 'color', color: '#121212', image: '', blur: 0, overlay: 0.5 },
        wheel: {
          size: 300,
          segments: [
            { id: 1, text: 'Prize 1', isWin: true, probability: 20, color: '#ef4444', textColor: '#ffffff' },
            { id: 2, text: 'Try Again', isWin: false, probability: 30, color: '#6b7280', textColor: '#ffffff' },
            { id: 3, text: 'Prize 2', isWin: true, probability: 15, color: '#3b82f6', textColor: '#ffffff' },
            { id: 4, text: 'Better Luck', isWin: false, probability: 35, color: '#9ca3af', textColor: '#ffffff' }
          ],
          borderColor: '#374151',
          borderWidth: 3
        },
        fonts: { primary: 'Inter', secondary: 'Inter' }
      },
      screens: {
        start: { enabled: true, headline: 'Spin to Win!', buttonText: 'Start Game' },
        game: { enabled: true, spinButtonText: 'SPIN NOW' },
        win: { enabled: true, headline: 'Congratulations!', buttonText: 'Claim Prize' },
        lose: { enabled: true, headline: 'Better Luck Next Time!', buttonText: 'Try Again' },
        leadCapture: { enabled: true, headline: 'Claim Your Prize', fields: [{ id: 'email', type: 'email', label: 'Email', required: true }] },
        thankYou: { enabled: true, headline: 'Thank You!', buttonText: 'Visit Website' }
      }
    };

    const newGame = createGame(defaultGame);
    setSelectedGame(newGame);
    setShowBuilder(true);
  };

  const handleEditGame = (game) => {
    setSelectedGame(game);
    setShowBuilder(true);
  };

  if (showBuilder && selectedGame) {
    return (
      <div className="premium-admin-wrapper min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <GameBuilder
          game={selectedGame}
          onBack={() => {
            setShowBuilder(false);
            setSelectedGame(null);
          }}
        />
      </div>
    );
  }

  const navItems = [
    { id: 'games', label: 'Dashboard', icon: FiGrid },
    { id: 'reports', label: 'Analytics', icon: FiBarChart2 },
    { id: 'redemptions', label: 'Redemptions', icon: FiGift },
  ];

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      <aside className="hidden md:flex flex-col w-64" style={{ borderRight: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div className="p-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            GretaAdmin
          </h1>
          <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>v2.0 Premium</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group"
              style={{
                background: activeTab === item.id ? 'var(--glass-bg)' : 'transparent',
                color: activeTab === item.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                border: activeTab === item.id ? '1px solid var(--border-color)' : '1px solid transparent'
              }}
            >
              <SafeIcon icon={item.icon} className="w-5 h-5" style={{ color: activeTab === item.id ? 'var(--brand-primary)' : 'inherit' }} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button className="w-full flex items-center space-x-3 px-4 py-3 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <SafeIcon icon={FiLogOut} className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="md:hidden h-16 flex items-center justify-between px-4 z-20" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <h1 className="text-lg font-bold" style={{ color: 'var(--brand-primary)' }}>
            GretaAdmin
          </h1>
          <div className="w-8 h-8 rounded-full" style={{ background: 'var(--brand-primary)' }}></div>
        </header>

        <div className="flex-1 overflow-y-auto admin-scroll p-4 md:p-8 pb-24 md:pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 fade-in">
            <div>
              <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Manage your campaigns and performance
              </p>
            </div>
            {activeTab === 'games' && (
              <button
                onClick={handleCreateGame}
                className="btn btn-primary px-5 py-2.5 font-medium flex items-center justify-center space-x-2 active:scale-95"
              >
                <SafeIcon icon={FiPlus} className="w-5 h-5" />
                <span>Create Campaign</span>
              </button>
            )}
          </div>

          {isLocalMode && (
            <div className="mb-6 p-4 rounded-xl text-sm flex items-center" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--warning-text, var(--warning))' }}>
              <span className="w-2 h-2 rounded-full mr-3 animate-pulse" style={{ background: 'var(--warning)' }}></span>
              Local Mode: Data is saved to your browser only. Connect Supabase for cloud sync.
            </div>
          )}

          <div className="premium-admin-wrapper">
            {activeTab === 'games' && <GameList onEditGame={handleEditGame} />}
            {activeTab === 'reports' && <LeadReporting />}
            {activeTab === 'redemptions' && <RedemptionLog />}
          </div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 flex justify-around items-center px-2 z-30 pb-safe" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-90 transition-transform"
            >
              <div className="p-1.5 rounded-xl" style={{ background: activeTab === item.id ? 'var(--glass-bg)' : 'transparent' }}>
                <SafeIcon
                  icon={item.icon}
                  className="w-6 h-6"
                  style={{ color: activeTab === item.id ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}
                />
              </div>
              <span className="text-[10px] font-medium" style={{ color: activeTab === item.id ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default AdminDashboard;
