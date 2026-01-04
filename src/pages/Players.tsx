import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { toast } from 'sonner';

export default function Players() {
  const navigate = useNavigate();
  const { players, addPlayer, deletePlayer, updatePlayer } = useGame();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddPlayer = () => {
    if (addPlayer(newPlayerName)) {
      setNewPlayerName('');
      toast.success('Player added!');
    } else {
      toast.error('Player already exists or invalid name');
    }
  };

  const handleDelete = (id: string, name: string) => {
    deletePlayer(id);
    toast.success(`${name} removed`);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = (id: string) => {
    if (updatePlayer(id, editName)) {
      setEditingId(null);
      toast.success('Player updated!');
    } else {
      toast.error('Name already taken or invalid');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 border-b border-border">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold text-foreground">Player Vault</h1>
          <p className="text-sm text-muted-foreground">{players.length} players</p>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 page-enter">
        {/* Add Player */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Enter player name..."
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors shadow-sm"
          />
          <button
            onClick={handleAddPlayer}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Player List */}
        <div className="space-y-3 stagger-children">
          {players.map((player) => (
            <div
              key={player.id}
              className="player-card flex items-center gap-4 bg-white/80 dark:bg-card/50"
            >
              <PlayerAvatar name={player.name} />

              {editingId === player.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(player.id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-background text-foreground border border-primary focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(player.id)}
                    className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{player.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Added {player.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(player.id, player.name)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Edit2 className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(player.id, player.name)}
                    className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          ))}

          {players.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Plus className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">No Players Yet</h3>
              <p className="text-sm text-muted-foreground">Add players to start tracking scores</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
