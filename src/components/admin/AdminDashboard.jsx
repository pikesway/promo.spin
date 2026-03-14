import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import GameList from './GameList';
import GameBuilder from './GameBuilder';
import LeadReporting from './LeadReporting';
import RedemptionLog from './RedemptionLog';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiPlus, FiGrid, FiBarChart2, FiGift, FiLogOut, FiMenu, FiX } = FiIcons;

const AdminDashboard = () => {
  const { createGame, isLocalMode } = useGame();
  const [activeTab, setActiveTab] = useState('games');
  const [selectedGame, setSelectedGame] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const handleCreateGame = () => {
    // Default game structure
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
      <div className="premium-admin-wrapper min-h-screen bg-charcoal-900 text-white">
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
    <div className="flex h-screen bg-charcoal-900 text-white overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-charcoal-800/50 backdrop-blur-xl">
        <div className="p-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            GretaAdmin
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">v2.0 Premium</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-neon' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <SafeIcon icon={item.icon} className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : 'group-hover:text-white'}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
           <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-500 hover:text-white transition-colors">
              <SafeIcon icon={FiLogOut} className="w-5 h-5" />
              <span className="text-sm">Logout</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden h-16 border-b border-white/5 bg-charcoal-800/80 backdrop-blur-md flex items-center justify-between px-4 z-20">
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            GretaAdmin
          </h1>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto admin-scroll p-4 md:p-8 pb-24 md:pb-8">
          
          {/* Header Action Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 fade-in">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Manage your campaigns and performance
              </p>
            </div>
            {activeTab === 'games' && (
              <button 
                onClick={handleCreateGame}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <SafeIcon icon={FiPlus} className="w-5 h-5" />
                <span>Create Campaign</span>
              </button>
            )}
          </div>

          {/* Local Mode Warning */}
          {isLocalMode && (
            <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm flex items-center">
               <span className="w-2 h-2 rounded-full bg-orange-400 mr-3 animate-pulse"></span>
               Local Mode: Data is saved to your browser only. Connect Supabase for cloud sync.
            </div>
          )}

          {/* Tab Content */}
          <div className="premium-admin-wrapper">
            {activeTab === 'games' && <GameList onEditGame={handleEditGame} />}
            {activeTab === 'reports' && <LeadReporting />}
            {activeTab === 'redemptions' && <RedemptionLog />}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-charcoal-900/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center px-2 z-30 pb-safe">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-90 transition-transform"
            >
              <div className={`p-1.5 rounded-xl ${activeTab === item.id ? 'bg-indigo-500/20' : 'bg-transparent'}`}>
                <SafeIcon 
                  icon={item.icon} 
                  className={`w-6 h-6 ${activeTab === item.id ? 'text-indigo-400' : 'text-gray-500'}`} 
                />
              </div>
              <span className={`text-[10px] font-medium ${activeTab === item.id ? 'text-indigo-400' : 'text-gray-500'}`}>
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