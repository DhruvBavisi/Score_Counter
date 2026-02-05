import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, ChevronDown, ChevronUp, Download, Trophy, TrendingDown, Trash2, Play, Clock } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DraftInfo {
  matchName: string;
  playerCount: number;
  timestamp: number;
}

export default function History() {
  const navigate = useNavigate();
  const { games, deleteGame } = useGame();
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem('game_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setDraftInfo({
          matchName: draft.matchName || 'Ongoing Game',
          playerCount: draft.selectedPlayers?.length || 0,
          timestamp: draft.timestamp
        });
        setHasDraft(true);
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  }, []);

  const continueDraft = () => {
    navigate('/new-match', { state: { loadDraft: true } });
  };

  const dismissDraft = () => {
    if (window.confirm('Are you sure you want to discard this game draft?')) {
      localStorage.removeItem('game_draft');
      setHasDraft(false);
      setDraftInfo(null);
      toast.success('Draft discarded');
    }
  };

  const handleDeleteGame = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setGameToDelete(id);
  };

  const confirmDelete = () => {
    if (gameToDelete) {
      deleteGame(gameToDelete);
      toast.success('Game history deleted');
      if (expandedGame === gameToDelete) {
        setExpandedGame(null);
      }
      setGameToDelete(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGame(expandedGame === id ? null : id);
  };

  const getWinnerIndex = (game: typeof games[0]) => {
    if (game.winnerRule === 'highest') {
      return game.totals.indexOf(Math.max(...game.totals));
    }
    return game.totals.indexOf(Math.min(...game.totals));
  };

  const exportToCSV = (game: typeof games[0]) => {
    const headers = ['Round', ...game.players];
    const rows = game.rounds.map((round, i) => [`R${i + 1}`, ...round]);
    rows.push(['Total', ...game.totals]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-${game.createdAt.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRankings = (game: typeof games[0]) => {
    const entries = game.players.map((name, i) => ({
      name,
      total: game.totals[i],
      rank: 0,
      index: i,
    }));
    entries.sort((a, b) =>
      game.winnerRule === 'highest' ? b.total - a.total : a.total - b.total
    );
    let rank = 0;
    let prev: number | null = null;
    for (let i = 0; i < entries.length; i++) {
      if (prev === null || entries[i].total !== prev) rank += 1;
      entries[i].rank = rank;
      prev = entries[i].total;
    }
    return entries;
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
          <h1 className="font-display text-lg font-bold text-foreground">Match History</h1>
          <p className="text-sm text-muted-foreground">{games.length} games played</p>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 page-enter">
        <AnimatePresence>
          {hasDraft && draftInfo && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 glass-card overflow-hidden border-primary/30 bg-primary/5"
            >
              <div className="w-full p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <Play className="w-6 h-6 text-primary-foreground fill-current ml-0.5" />
                </div>
                
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">
                    {draftInfo.matchName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {draftInfo.playerCount} Players · In Progress
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary fill-current" />
                  <span className="text-sm font-semibold text-foreground">In Progress</span>
                  <button
                    onClick={continueDraft}
                    className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors ml-2"
                    title="Resume Game"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                  <button 
                    onClick={dismissDraft}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                    title="Discard Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronDown className="w-5 h-5 text-muted-foreground invisible" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4 stagger-children">
          {games.map((game) => {
            const winnerIndex = getWinnerIndex(game);
            const isExpanded = expandedGame === game.id;

            return (
              <div key={game.id} className="glass-card overflow-hidden">
                {/* Game Header */}
                <div
                  onClick={() => toggleExpand(game.id)}
                  className="w-full p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    {game.winnerRule === 'highest' ? (
                      <Trophy className="w-6 h-6 text-primary" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-foreground">
                      {game.matchName && game.matchName.trim().length > 0
                        ? game.matchName
                        : `${game.players.length} Players · ${game.rounds.length} Rounds`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {game.createdAt.toLocaleDateString()} at {game.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-foreground">{game.players[winnerIndex]}</span>
                    <button
                      onClick={(e) => handleDeleteGame(e, game.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors ml-2"
                      title="Delete Game"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 animate-fade-in">
                    {/* Final Rankings */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                      {getRankings(game).map(({ name, total, rank, index }) => {
                        const cardClass =
                          rank === 1
                            ? 'bg-gradient-to-br from-yellow-200/40 via-amber-100/25 to-yellow-100/20 border-[hsl(45,100%,55%)] shadow-[0_4px_12px_-8px_hsl(45,100%,55%/0.25)]'
                            : rank === 2
                            ? 'bg-gradient-to-br from-zinc-200/40 via-zinc-100/25 to-white/20 border-[hsl(0,0%,70%)] shadow-[0_4px_12px_-8px_hsl(0,0%,70%/0.2)]'
                            : rank === 3
                            ? 'bg-gradient-to-br from-amber-200/30 via-orange-200/20 to-amber-100/15 border-[hsl(30,70%,45%)] shadow-[0_4px_12px_-8px_hsl(30,70%,45%/0.2)]'
                            : 'bg-secondary/50 border-border';
                        const nameClass =
                          rank === 1
                            ? 'text-yellow-700'
                            : rank === 2
                            ? 'text-white'
                            : rank === 3
                            ? 'text-amber-700'
                            : 'text-foreground';
                        const ptsClass =
                          rank === 1
                            ? 'text-yellow-600'
                            : rank === 2
                            ? 'text-white'
                            : rank === 3
                            ? 'text-amber-600'
                            : 'text-muted-foreground';
                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-2xl transition-all border-2 shadow ${cardClass} flex items-center gap-2`}
                          >
                            {rank === 1 ? (
                              <Crown className="w-4 h-4 text-yellow-500 crown-bounce" />
                            ) : (
                              <span className="w-5 text-xs font-bold text-muted-foreground">#{rank}</span>
                            )}
                            <PlayerAvatar name={name} size="sm" isWinner={rank === 1} />
                            <div className="flex-1">
                              <div className={`text-sm font-semibold ${nameClass}`}>{name}</div>
                              <div className={`font-display text-xs font-bold ${ptsClass}`}>{total} pts</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Round Details */}
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="p-2 text-left text-muted-foreground font-normal">Round</th>
                            {game.players.map((player, i) => (
                              <th key={i} className="p-2 text-center text-foreground font-medium">
                                {player.slice(0, 3)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {game.rounds.map((round, rowIndex) => (
                            <tr key={rowIndex} className="border-t border-border/50">
                              <td className="p-2 text-muted-foreground">R{rowIndex + 1}</td>
                              {round.map((score, colIndex) => (
                                <td key={colIndex} className="p-2 text-center text-foreground">
                                  {score}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate('/new-match', { state: { gameData: game } })}
                        className="w-full py-3 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-glow-sm active:scale-[0.98]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Resume Game
                      </button>
                      <button
                        onClick={() => exportToCSV(game)}
                        className="w-full py-3 rounded-xl bg-secondary text-foreground flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export to CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {games.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Trophy className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">No Games Yet</h3>
              <p className="text-sm text-muted-foreground">Start a new match to see history</p>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!gameToDelete} onOpenChange={(open) => !open && setGameToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Game History?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this game record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
