import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingDown, Check, Plus, Crown, Medal, Play, ChevronDown } from 'lucide-react';
import { useGame, Player } from '@/contexts/GameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Numpad } from '@/components/Numpad';
import { Confetti } from '@/components/Confetti';
import { toast } from 'sonner';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface RankingPlayer {
  player: Player;
  total: number;
  rank: number;
}

export default function NewMatch() {
  const navigate = useNavigate();
  const { players: allPlayers, addPlayer, addGame } = useGame();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Setup state
  const [winnerRule, setWinnerRule] = useState<'highest' | 'lowest'>('highest');
  const [numRounds, setNumRounds] = useState(5);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [matchName, setMatchName] = useState('');
  const toTitleCase = (s: string) =>
    s.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  // Scoreboard state
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState<number[][]>([]);
  const [currentCell, setCurrentCell] = useState<{ row: number; col: number } | null>(null);
  const [numpadValue, setNumpadValue] = useState('');
  const [gameFinished, setGameFinished] = useState(false);
  const [inactivePlayers, setInactivePlayers] = useState<string[]>([]);

  const togglePlayer = (player: Player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  const handleAddNewPlayer = () => {
    if (addPlayer(newPlayerName)) {
      setNewPlayerName('');
      toast.success('Player added!');
    } else {
      toast.error('Player already exists or invalid name');
    }
  };

  const startGame = () => {
    if (selectedPlayers.length < 2) {
      toast.error('Select at least 2 players');
      return;
    }
    setScores(Array(numRounds).fill(null).map(() => Array(selectedPlayers.length).fill(0)));
    setGameStarted(true);
  };

  const openNumpad = (row: number, col: number) => {
    const playerId = selectedPlayers[col]?.id;
    if (playerId && inactivePlayers.includes(playerId)) return;
    setCurrentCell({ row, col });
    setNumpadValue(scores[row][col].toString());
    scrollActiveCellIntoView(row, col);
  };

  const handleNumpadChange = (next: string) => {
    setNumpadValue(next);
    if (!currentCell) return;
    const val = next === '' ? 0 : parseInt(next, 10);
    if (isNaN(val)) return;
    const updated = [...scores];
    updated[currentCell.row][currentCell.col] = val;
    setScores(updated);
  };

  const scrollActiveCellIntoView = (row: number, col: number) => {
    const container = scrollRef.current;
    const cell = document.querySelector(`button[data-row="${row}"][data-col="${col}"]`) as HTMLButtonElement | null;
    if (!container || !cell) return;
    const containerRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const padding = 40;
    if (cellRect.right > containerRect.right - padding) {
      container.scrollLeft += cellRect.right - (containerRect.right - padding);
    } else if (cellRect.left < containerRect.left + padding) {
      container.scrollLeft -= (containerRect.left + padding) - cellRect.left;
    }
    const panel = document.getElementById('numpad-panel') as HTMLDivElement | null;
    const panelHeight = panel?.offsetHeight || 300;
    const bottomThreshold = window.innerHeight - panelHeight - 24;
    if (cellRect.bottom > bottomThreshold) {
      window.scrollBy({ top: cellRect.bottom - bottomThreshold, behavior: 'smooth' });
    }
  };

  const moveCursor = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!currentCell) return;
    const { row, col } = currentCell;
    const maxRow = scores.length - 1;
    const maxCol = selectedPlayers.length - 1;
    if (dir === 'up' && row > 0) {
      setCurrentCell({ row: row - 1, col });
      setNumpadValue(scores[row - 1][col].toString());
    } else if (dir === 'down' && row < maxRow) {
      setCurrentCell({ row: row + 1, col });
      setNumpadValue(scores[row + 1][col].toString());
    } else if (dir === 'left') {
      let next = col - 1;
      while (next >= 0 && inactivePlayers.includes(selectedPlayers[next].id)) next--;
      if (next >= 0) {
        setCurrentCell({ row, col: next });
        setNumpadValue(scores[row][next].toString());
        scrollActiveCellIntoView(row, next);
      }
    } else if (dir === 'right') {
      let next = col + 1;
      while (next <= maxCol && inactivePlayers.includes(selectedPlayers[next].id)) next++;
      if (next <= maxCol) {
        setCurrentCell({ row, col: next });
        setNumpadValue(scores[row][next].toString());
        scrollActiveCellIntoView(row, next);
      }
    }
  };

  const handleNumpadEnter = () => {
    if (!currentCell) return;

    const value = numpadValue === '' ? 0 : parseInt(numpadValue, 10);
    if (isNaN(value)) return;

    const newScores = [...scores];
    newScores[currentCell.row][currentCell.col] = value;
    setScores(newScores);

    // Move to next cell
    const { row, col } = currentCell;
    const numPlayers = selectedPlayers.length;
    if (col < numPlayers - 1) {
      setCurrentCell({ row, col: col + 1 });
      setNumpadValue(newScores[row][col + 1].toString());
      scrollActiveCellIntoView(row, col + 1);
    } else if (row < newScores.length - 1) {
      setCurrentCell({ row: row + 1, col: 0 });
      setNumpadValue(newScores[row + 1][0].toString());
      scrollActiveCellIntoView(row + 1, 0);
    } else {
      setCurrentCell(null);
    }
  };

  const calculateTotals = (): number[] => {
    return selectedPlayers.map((_, playerIndex) =>
      scores.reduce((sum, round) => sum + (round[playerIndex] || 0), 0)
    );
  };

  const getWinnerIndex = (): number => {
    const totals = calculateTotals();
    if (winnerRule === 'highest') {
      return totals.indexOf(Math.max(...totals));
    }
    return totals.indexOf(Math.min(...totals));
  };

  const finishGame = () => {
    const totals = calculateTotals();
    addGame({
      players: selectedPlayers.map(p => p.name),
      rounds: scores,
      totals,
      winnerRule,
      matchName,
    });
    setGameFinished(true);
    toast.success('Game saved!');
  };

  const totals = calculateTotals();
  const winnerIndex = getWinnerIndex();
  const extremeTotal = winnerRule === 'highest' ? Math.max(...totals) : Math.min(...totals);
  const rankings = useMemo(() => {
    if (!gameFinished) return [];

    const currentTotals = selectedPlayers.map((_, playerIndex) =>
      scores.reduce((sum, round) => sum + (round[playerIndex] || 0), 0)
    );

    const playersWithTotals = selectedPlayers.map((player, index) => ({
      player,
      total: currentTotals[index],
      rank: 0
    }));

    // Sort by total (descending for highest wins, ascending for lowest wins)
    playersWithTotals.sort((a, b) => 
      winnerRule === 'highest' ? b.total - a.total : a.total - b.total
    );

    // Dense ranking: ties share rank, next distinct value increments by 1
    let rank = 0;
    let prevTotal: number | null = null;
    for (let i = 0; i < playersWithTotals.length; i++) {
      if (prevTotal === null || playersWithTotals[i].total !== prevTotal) {
        rank += 1;
      }
      playersWithTotals[i].rank = rank;
      prevTotal = playersWithTotals[i].total;
    }

    return playersWithTotals;
  }, [gameFinished, scores, selectedPlayers, winnerRule]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500 crown-bounce" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  // Setup View
  if (!gameStarted) {
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
          <h1 className="font-display text-lg font-bold text-foreground">New Match</h1>
        </header>

        <main className="p-6 pb-32 page-enter space-y-8">
          {/* Predefined Games */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Games</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setWinnerRule('lowest');
                  setMatchName('Badam Satti');
                  toast.success('Badam Satti selected (lowest wins)');
                }}
                className="p-4 rounded-2xl border-2 transition-all border-primary/40 bg-primary/10 hover:bg-primary/15"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Badam Satti</p>
                  <p className="text-xs text-muted-foreground mt-1">Lowest score wins</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setWinnerRule('highest');
                  setMatchName('Kachu Phool');
                  toast.success('Kachu Phool selected (highest wins)');
                }}
                className="p-4 rounded-2xl border-2 transition-all border-primary/40 bg-primary/10 hover:bg-primary/15"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Kachu Phool</p>
                  <p className="text-xs text-muted-foreground mt-1">Highest score wins</p>
                </div>
              </button>
            </div>
          </section>
          {/* Match Name */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Match Name</h2>
            <input
              type="text"
              value={matchName}
              onChange={(e) => setMatchName(toTitleCase(e.target.value))}
              placeholder="Enter match name..."
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
          </section>
          {/* Winner Rule */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Winner Rule</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setWinnerRule('highest')}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  winnerRule === 'highest'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Trophy className={`w-8 h-8 mx-auto mb-2 ${winnerRule === 'highest' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm font-semibold text-foreground">Highest Wins</p>
              </button>
              <button
                onClick={() => setWinnerRule('lowest')}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  winnerRule === 'lowest'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <TrendingDown className={`w-8 h-8 mx-auto mb-2 ${winnerRule === 'lowest' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm font-semibold text-foreground">Lowest Wins</p>
              </button>
            </div>
          </section>

          {/* Rounds */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Number of Rounds</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setNumRounds(Math.max(1, numRounds - 1))}
                className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold text-xl border border-primary/30 hover:bg-primary/15 transition-colors"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <span className="font-display text-4xl font-bold text-foreground">{numRounds}</span>
              </div>
              <button
                onClick={() => setNumRounds(Math.min(20, numRounds + 1))}
                className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold text-xl border border-primary/30 hover:bg-primary/15 transition-colors"
              >
                +
              </button>
            </div>
          </section>

          {/* Players */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Select Players ({selectedPlayers.length} selected)
            </h2>

            {/* Add New Player */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewPlayer()}
                placeholder="New player name..."
                className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
              />
              <button
                onClick={handleAddNewPlayer}
                className="px-4 py-3 rounded-xl bg-primary text-primary-foreground"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Player List */}
            <PlayerList
              players={allPlayers}
              selectedPlayers={selectedPlayers}
              onToggle={togglePlayer}
            />
          </section>
        </main>

        {/* Start Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent safe-bottom">
          <button
            onClick={startGame}
            disabled={selectedPlayers.length < 2}
            className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
          >
            <Play className="w-5 h-5" />
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // Scoreboard View
  return (
    <div className="min-h-screen bg-background safe-top safe-bottom flex flex-col">
      {gameFinished && <Confetti />}

      {/* Header */}
      <header className="p-4 flex items-center gap-4 border-b border-border">
        <button
          onClick={() => gameFinished ? navigate('/') : setGameStarted(false)}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Scoreboard</h1>
      </header>

      <main className={`flex-1 p-6 page-enter space-y-6 ${currentCell ? 'pb-56' : 'pb-36'}`}>
        {/* Score Table */}
        <div className="overflow-auto -mx-6 px-0 pb-0 mobile-hide-scrollbar relative max-h-[70vh] bg-background" ref={scrollRef}>
          <table className="w-full border-separate min-w-max no-border-spacing">
            <thead className="sticky top-0 z-50 bg-background shadow-none">
              <tr>
                <th className="p-2 text-center text-xs text-muted-foreground font-normal sticky left-0 top-0 z-50 bg-background border-b border-border border-r">Round</th>
                {selectedPlayers.map((player, i) => (
                  <th
                    key={player.id}
                    className={`p-2 text-center min-w-[80px] sticky top-0 z-50 bg-background border-b border-border ${currentCell?.col === i ? 'text-primary' : 'text-foreground'}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {i === winnerIndex && gameFinished && <Crown className="w-4 h-4 crown-bounce text-yellow-500" />}
                      <PlayerAvatar name={player.name} size="sm" isWinner={i === winnerIndex && gameFinished} />
                      <span className="text-xs font-medium truncate max-w-[70px]">{player.name}</span>
                      <button
                        onClick={() => setInactivePlayers((prev) => prev.includes(player.id) ? prev.filter(id => id !== player.id) : [...prev, player.id])}
                        className={`mt-1 px-2 py-0.5 rounded-md text-xs border ${inactivePlayers.includes(player.id) ? 'bg-destructive/20 text-destructive border-destructive/40' : 'bg-secondary text-foreground border-border'}`}
                      >
                        {inactivePlayers.includes(player.id) ? 'Resume' : 'Stop'}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
              <tbody>
                {scores.map((round, rowIndex) => (
                  <tr key={rowIndex} className={`${currentCell?.row === rowIndex ? 'bg-primary/5' : ''}`}>
                    <td className="p-2 text-sm text-muted-foreground text-center sticky left-0 z-40 bg-background border-r border-border">R{rowIndex + 1}</td>
                    {round.map((score, colIndex) => (
                      <td key={colIndex} className="p-1">
                        <button
                          onClick={() => !gameFinished && openNumpad(rowIndex, colIndex)}
                          disabled={gameFinished || inactivePlayers.includes(selectedPlayers[colIndex].id)}
                        className={`w-full h-12 rounded-xl font-display font-bold text-lg transition-all bg-secondary text-foreground hover:bg-secondary/80 ${gameFinished || inactivePlayers.includes(selectedPlayers[colIndex].id) ? 'cursor-default opacity-50' : ''} ${currentCell?.col === colIndex && currentCell?.row === rowIndex ? 'ring-2 ring-primary/50' : ''}`}
                        data-row={rowIndex}
                        data-col={colIndex}
                      >
                        {score}
                      </button>
                    </td>
                  ))}
                </tr>
                ))}
                {/* Add Round Placeholder Row */}
                {!gameFinished && (
                  <tr className="opacity-60">
                    <td className="p-2 text-sm text-muted-foreground text-center sticky left-0 z-40 bg-background border-r border-border">
                      <button
                        onClick={() => setScores(prev => [...prev, Array(selectedPlayers.length).fill(0)])}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground"
                      >
                        R{scores.length + 1} +
                    </button>
                  </td>
                  {selectedPlayers.map((_, i) => (
                    <td key={`placeholder-${i}`} className="p-1">
                      <button
                        disabled
                        className="w-full h-12 rounded-xl bg-secondary/60 text-muted-foreground"
                      >
                        -
                      </button>
                    </td>
                  ))}
                </tr>
              )}
              </tbody>
              <tfoot className="sticky bottom-0 z-50 bg-background shadow-none">
                <tr className="border-t-2 border-border">
                  <td className="p-2 text-sm font-bold text-foreground text-center sticky left-0 z-40 bg-background border-r border-border">Total</td>
                  {totals.map((total, i) => (
                    <td
                      key={i}
                      className={`p-2 text-center font-display text-xl font-bold ${total === extremeTotal ? 'text-red-600' : 'text-foreground'}`}
                    >
                    {total}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rankings */}
        {gameFinished && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-display text-lg font-bold text-foreground">Final Rankings</h2>
            <div className="space-y-2">
              {rankings.map(({ player, total, rank }) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl transition-all border-2 shadow ${
                    rank === 1
                      ? 'bg-gradient-to-br from-yellow-200/40 via-amber-100/25 to-yellow-100/20 border-[hsl(45,100%,55%)] shadow-[0_4px_12px_-8px_hsl(45,100%,55%/0.25)]'
                    : rank === 2
                      ? 'bg-gradient-to-br from-zinc-200/40 via-zinc-100/25 to-white/20 border-[hsl(0,0%,70%)] shadow-[0_4px_12px_-8px_hsl(0,0%,70%/0.2)]'
                    : rank === 3
                      ? 'bg-gradient-to-br from-amber-200/30 via-orange-200/20 to-amber-100/15 border-[hsl(30,70%,45%)] shadow-[0_4px_12px_-8px_hsl(30,70%,45%/0.2)]'
                    : 'bg-secondary/50 border-border'
                  }`}
                >
                  {getRankBadge(rank)}
                  <PlayerAvatar name={player.name} size="sm" isWinner={rank === 1} />
                  <span className={`font-semibold flex-1 ${rank === 1 ? 'text-yellow-700' : rank === 2 ? 'text-white' : rank === 3 ? 'text-amber-700' : 'text-foreground'}`}>
                    {player.name}
                  </span>
                  <span className={`font-display font-bold ${rank === 1 ? 'text-yellow-600' : rank === 2 ? 'text-white' : rank === 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {total} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <div className="p-6 bg-gradient-to-t from-background to-transparent safe-bottom">
        {!gameFinished ? (
          <button
            onClick={finishGame}
            className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-bold text-lg shadow-glow"
          >
            Finish Game
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl bg-secondary text-foreground font-display font-bold text-lg"
          >
            Back to Home
          </button>
        )}
      </div>

      {/* Numpad Modal */}
      {currentCell && (
        <Numpad
          value={numpadValue}
          onChange={handleNumpadChange}
          onEnter={handleNumpadEnter}
          onClose={() => setCurrentCell(null)}
          onMove={moveCursor}
          onPanX={(dx) => {
            if (scrollRef.current) {
              scrollRef.current.scrollLeft += dx;
            }
          }}
          rowIndex={currentCell.row}
          colIndex={currentCell.col}
          playerName={selectedPlayers[currentCell.col]?.name}
        />
      )}
    </div>
  );
}

function PlayerList({
  players,
  selectedPlayers,
  onToggle,
}: {
  players: Player[];
  selectedPlayers: Player[];
  onToggle: (player: Player) => void;
}) {
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const groups = useMemo(() => {
    const map = new Map<string, Player[]>();
    for (const p of sortedPlayers) {
      const key = p.group?.trim() || 'Ungrouped';
      const arr = map.get(key) || [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedPlayers]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto">
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
          <CollapsibleContent className="space-y-2 pt-2">
            {groupPlayers.map((player) => {
              const isSelected = selectedPlayers.some((p) => p.id === player.id);
              const orderIndex = selectedPlayers.findIndex((p) => p.id === player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => onToggle(player)}
                  className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <PlayerAvatar name={player.name} size="sm" />
                  <span className="font-medium text-foreground">{player.name}</span>
                  {isSelected && (
                    <span className="ml-auto px-2 py-1 rounded-md bg-primary/15 text-primary font-bold text-sm">
                      {orderIndex + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ))}

      {players.length === 0 && (
        <p className="text-center text-muted-foreground py-6">No players yet. Add some above!</p>
      )}
    </div>
  );
}
