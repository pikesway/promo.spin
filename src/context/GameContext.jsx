import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection } from '../supabase/client';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Load games from Supabase (or fallback to localStorage)
  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      
      const hasSupabase = checkSupabaseConnection();
      
      if (hasSupabase) {
        try {
          const { data, error } = await supabase
            .from('games')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          
          // Flatten structure: database stores 'data' JSONB column, but app expects flat object
          // We merge the 'data' column back into the root object
          const formattedGames = data.map(row => ({
            ...row.data,
            id: row.id, // Ensure ID matches DB ID
            name: row.name,
            isActive: row.is_active,
            createdAt: row.created_at
          }));
          
          setGames(formattedGames);
          setIsLocalMode(false);
        } catch (err) {
          console.error('Error fetching games from Supabase:', err);
          // Fallback to local on error
          loadFromLocal();
        }
      } else {
        loadFromLocal();
      }
      
      setIsLoading(false);
    };

    const loadFromLocal = () => {
      setIsLocalMode(true);
      const savedGames = localStorage.getItem('spinToWinGames');
      if (savedGames) {
        try {
          setGames(JSON.parse(savedGames));
        } catch (e) {
          console.error('Failed to parse local games', e);
        }
      }
    };

    loadGames();
  }, []);

  // Sync to Storage (Dual write for safety)
  const saveGameToStorage = async (newGame, isUpdate = false) => {
    // 1. Always update local state immediately for UI responsiveness
    setGames(prev => {
      if (isUpdate) {
        return prev.map(g => g.id === newGame.id ? newGame : g);
      }
      return [...prev, newGame];
    });

    // 2. Save to localStorage (Backup)
    const currentGames = isUpdate 
      ? games.map(g => g.id === newGame.id ? newGame : g)
      : [...games, newGame];
    localStorage.setItem('spinToWinGames', JSON.stringify(currentGames));

    // 3. Save to Supabase
    if (supabase) {
      try {
        const payload = {
          id: newGame.id,
          name: newGame.name,
          is_active: newGame.isActive,
          data: newGame // Store full object in JSONB
        };

        const { error } = await supabase
          .from('games')
          .upsert(payload);

        if (error) console.error('Supabase save error:', error);
      } catch (err) {
        console.error('Failed to save to cloud:', err);
      }
    }
  };

  const createGame = (gameData) => {
    const newGame = {
      id: crypto.randomUUID(), // Use standard UUID for DB compatibility
      ...gameData,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    saveGameToStorage(newGame, false);
    return newGame;
  };

  const updateGame = (gameId, updates) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    const updatedGame = { ...game, ...updates };
    saveGameToStorage(updatedGame, true);
  };

  const deleteGame = async (gameId) => {
    // Update local
    setGames(prev => prev.filter(game => String(game.id) !== String(gameId)));
    localStorage.setItem('spinToWinGames', JSON.stringify(games.filter(g => g.id !== gameId)));

    // Update cloud
    if (supabase) {
      await supabase.from('games').delete().eq('id', gameId);
    }
  };

  const duplicateGame = (gameId) => {
    const gameToClone = games.find(game => game.id === gameId);
    if (gameToClone) {
      const clonedGame = {
        ...gameToClone,
        id: crypto.randomUUID(),
        name: `${gameToClone.name} (Copy)`,
        createdAt: new Date().toISOString()
      };
      saveGameToStorage(clonedGame, false);
      return clonedGame;
    }
  };

  const getGame = (gameId) => {
    return games.find(game => String(game.id) === String(gameId));
  };

  const value = {
    games,
    currentGame,
    setCurrentGame,
    createGame,
    updateGame,
    deleteGame,
    duplicateGame,
    getGame,
    isLoading,
    isLocalMode
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};