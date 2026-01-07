import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, ChevronDown } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { toast } from 'sonner';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

export default function Players() {
  const navigate = useNavigate();
  const { players, addPlayer, deletePlayer, updatePlayer } = useGame();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGroup, setNewPlayerGroup] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');

  const handleAddPlayer = () => {
    if (addPlayer(newPlayerName, newPlayerGroup || undefined)) {
      setNewPlayerName('');
      setNewPlayerGroup('');
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
    const player = players.find(p => p.id === id);
    setEditGroup(player?.group || '');
  };

  const saveEdit = (id: string) => {
    if (updatePlayer(id, editName, editGroup || undefined)) {
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Enter player name..."
            className="px-4 py-3 rounded-xl bg-white dark:bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors shadow-sm"
          />
          <input
            type="text"
            value={newPlayerGroup}
            onChange={(e) => setNewPlayerGroup(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Group (optional)"
            className="px-4 py-3 rounded-xl bg-white dark:bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors shadow-sm"
          />
          <button
            onClick={handleAddPlayer}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Player List */}
        <div className="space-y-4 stagger-children">
          <GroupedPlayers
            players={players}
            editingId={editingId}
            editName={editName}
            editGroup={editGroup}
            setEditName={setEditName}
            setEditGroup={setEditGroup}
            startEdit={startEdit}
            saveEdit={saveEdit}
            cancelEdit={cancelEdit}
            handleDelete={handleDelete}
          />

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

function GroupedPlayers({
  players,
  editingId,
  editName,
  editGroup,
  setEditName,
  setEditGroup,
  startEdit,
  saveEdit,
  cancelEdit,
  handleDelete,
}: {
  players: ReturnType<typeof useGame>['players'];
  editingId: string | null;
  editName: string;
  editGroup: string;
  setEditName: (v: string) => void;
  setEditGroup: (v: string) => void;
  startEdit: (id: string, name: string) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
  handleDelete: (id: string, name: string) => void;
}) {
  const sorted = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const p of sorted) {
      const key = (p.group?.trim() || 'Ungrouped');
      const arr = map.get(key) || [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sorted]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      {groups.map(([groupName, groupPlayers]) => (
        <Collapsible
          key={groupName}
          open={!!open[groupName]}
          onOpenChange={(v) => setOpen((prev) => ({ ...prev, [groupName]: v }))}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80">
              <span className="text-sm font-semibold">{groupName}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{groupPlayers.length}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground ${open[groupName] ? 'rotate-180 transition-transform' : 'transition-transform'}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {groupPlayers.map((player) => (
              <div key={player.id} className="player-card flex items-center gap-4 bg-white/80 dark:bg-card/50">
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
                    <input
                      type="text"
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(player.id)}
                      placeholder="Group"
                      className="px-3 py-2 rounded-lg bg-background text-foreground border border-border focus:outline-none"
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
                        {player.group ? `Group: ${player.group} · ` : ''}Added {player.createdAt.toLocaleDateString()}
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
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
