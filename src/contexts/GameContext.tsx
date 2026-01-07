import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Player {
  id: string;
  name: string;
  group?: string;
  createdAt: Date;
}

export interface Game {
  id: string;
  players: string[];
  rounds: number[][];
  totals: number[];
  winnerRule: 'highest' | 'lowest';
  matchName?: string;
  createdAt: Date;
}

interface GameContextType {
  players: Player[];
  games: Game[];
  addPlayer: (name: string, group?: string) => boolean;
  deletePlayer: (id: string) => void;
  updatePlayer: (id: string, name: string, group?: string) => boolean;
  addGame: (game: Omit<Game, 'id' | 'createdAt'>) => void;
  deleteGame: (id: string) => void;
  clearAllData: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState<Player[]>(() => {
    const stored = localStorage.getItem('game-tracker-players');
    if (stored) {
      return JSON.parse(stored).map((p: Omit<Player, 'createdAt'> & { createdAt: string }) => ({
        ...p,
        createdAt: new Date(p.createdAt)
      }));
    }
    return [];
  });

  const [games, setGames] = useState<Game[]>(() => {
    const stored = localStorage.getItem('game-tracker-games');
    if (stored) {
      return JSON.parse(stored).map((g: Omit<Game, 'createdAt'> & { createdAt: string }) => ({
        ...g,
        createdAt: new Date(g.createdAt)
      }));
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('game-tracker-players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('game-tracker-games', JSON.stringify(games));
  }, [games]);

  const formatName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const addPlayer = (name: string, group?: string): boolean => {
    const formattedName = formatName(name);
    if (!formattedName) return false;
    
    const exists = players.some(
      p => p.name.toLowerCase() === formattedName.toLowerCase()
    );
    if (exists) return false;

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: formattedName,
      group: group && formatName(group),
      createdAt: new Date()
    };
    setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
    return true;
  };

  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const updatePlayer = (id: string, name: string, group?: string): boolean => {
    const formattedName = formatName(name);
    if (!formattedName) return false;

    const exists = players.some(
      p => p.id !== id && p.name.toLowerCase() === formattedName.toLowerCase()
    );
    if (exists) return false;

    setPlayers(prev =>
      prev
        .map(p => (p.id === id ? { ...p, name: formattedName, group: group && formatName(group) } : p))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return true;
  };

  const addGame = (game: Omit<Game, 'id' | 'createdAt'>) => {
    const newGame: Game = {
      ...game,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };
    setGames(prev => [newGame, ...prev]);
  };

  const deleteGame = (id: string) => {
    setGames(prev => prev.filter(g => g.id !== id));
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      setPlayers([]);
      setGames([]);
      localStorage.removeItem('game-tracker-players');
      localStorage.removeItem('game-tracker-games');
    }
  };

  return (
    <GameContext.Provider
      value={{
        players,
        games,
        addPlayer,
        deletePlayer,
        updatePlayer,
        addGame,
        deleteGame,
        clearAllData
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
