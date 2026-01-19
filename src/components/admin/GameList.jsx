import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import SafeIcon from '../../common/SafeIcon';
import GlassCard from '../../common/GlassCard';
import * as FiIcons from 'react-icons/fi';

const { FiEdit, FiCopy, FiTrash2, FiExternalLink, FiMoreVertical, FiPlay, FiPause } = FiIcons;

const GameList = ({ onEditGame }) => {
  const { games, updateGame, deleteGame, duplicateGame } = useGame();
  
  const handleToggleActive = (e, gameId, isActive) => {
    e.stopPropagation();
    updateGame(gameId, { isActive: !isActive });
  };

  const getGameUrl = (gameId) => `${window.location.origin}/#/game/${gameId}`;

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-white/10 bg-white/5">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
          <SafeIcon icon={FiPlay} className="w-8 h-8 text-indigo-400 ml-1" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
        <p className="text-gray-400 max-w-sm mx-auto">Create your first spin-to-win game to start engaging your audience.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <GlassCard 
          key={game.id} 
          hoverEffect={true}
          onClick={() => onEditGame(game)}
          className="group flex flex-col h-full border-l-4"
          style={{ borderLeftColor: game.isActive ? '#10B981' : '#6B7280' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {game.name}
              </h3>
              <p className="text-xs text-gray-500 font-mono mt-1">ID: {game.id.substring(0, 8)}...</p>
            </div>
            <div className={`
              px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
              ${game.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}
            `}>
              {game.isActive ? 'Active' : 'Paused'}
            </div>
          </div>

          {/* Stats Preview (Mock Data for visual) */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">Views</div>
              <div className="text-sm font-bold text-white">0</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">Leads</div>
              <div className="text-sm font-bold text-indigo-400">0</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">Win Rate</div>
              <div className="text-sm font-bold text-green-400">0%</div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-2">
            <div className="flex space-x-1">
              <button 
                onClick={(e) => handleToggleActive(e, game.id, game.isActive)}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title={game.isActive ? "Pause" : "Activate"}
              >
                <SafeIcon icon={game.isActive ? FiPause : FiPlay} className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); duplicateGame(game.id); }}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Duplicate"
              >
                <SafeIcon icon={FiCopy} className="w-4 h-4" />
              </button>
              <a 
                href={getGameUrl(game.id)} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Open Live"
              >
                <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
              </a>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) deleteGame(game.id); }}
              className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <SafeIcon icon={FiTrash2} className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

export default GameList;