import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingDown, Check, Plus, Crown, Medal, Play } from 'lucide-react';
import { useGame, Player } from '@/contexts/GameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Numpad } from '@/components/Numpad';
import { Confetti } from '@/components/Confetti';
import { toast } from 'sonner';

interface RankingPlayer {
  player: Player;
  total: number;
  rank: number;
}

export default function NewMatch() {
  const navigate = useNavigate();
  const { players: allPlayers, addPlayer, addGame } = useGame();

  // Setup state
  const [winnerRule, setWinnerRule] = useState<'highest' | 'lowest'>('highest');
  const [numRounds, setNumRounds] = useState(5);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Scoreboard state
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState<number[][]>([]);
  const [currentCell, setCurrentCell] = useState<{ row: number; col: number } | null>(null);
  const [numpadValue, setNumpadValue] = useState('');
  const [gameFinished, setGameFinished] = useState(false);

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
    setCurrentCell({ row, col });
    setNumpadValue(scores[row][col].toString());
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
    } else if (row < newScores.length - 1) {
      setCurrentCell({ row: row + 1, col: 0 });
      setNumpadValue(newScores[row + 1][0].toString());
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
    });
    setGameFinished(true);
    toast.success('Game saved!');
  };

  const totals = calculateTotals();
  const winnerIndex = getWinnerIndex();
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
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {allPlayers.map((player) => {
                const isSelected = selectedPlayers.find(p => p.id === player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player)}
                    className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <PlayerAvatar name={player.name} size="sm" />
                    <span className="font-medium text-foreground">{player.name}</span>
                    {isSelected && <Check className="w-5 h-5 text-primary ml-auto" />}
                  </button>
                );
              })}

              {allPlayers.length === 0 && (
                <p className="text-center text-muted-foreground py-6">
                  No players yet. Add some above!
                </p>
              )}
            </div>
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
    <div className="min-h-screen bg-background safe-top safe-bottom">
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

      <main className={`p-6 page-enter space-y-6 ${currentCell ? 'pb-48' : ''}`}>
        {/* Score Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs text-muted-foreground font-normal">Round</th>
                {selectedPlayers.map((player, i) => (
                  <th
                    key={player.id}
                    className={`p-2 text-center min-w-[80px] ${i === winnerIndex && gameFinished ? 'text-accent' : 'text-foreground'}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {i === winnerIndex && gameFinished && <Crown className="w-4 h-4 crown-bounce text-accent" />}
                      <PlayerAvatar name={player.name} size="sm" isWinner={i === winnerIndex && gameFinished} />
                      <span className="text-xs font-medium truncate max-w-[70px]">{player.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.map((round, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="p-2 text-sm text-muted-foreground">R{rowIndex + 1}</td>
                  {round.map((score, colIndex) => (
                    <td key={colIndex} className="p-1">
                      <button
                        onClick={() => !gameFinished && openNumpad(rowIndex, colIndex)}
                        disabled={gameFinished}
                        className={`w-full h-12 rounded-xl font-display font-bold text-lg transition-all ${
                          colIndex === winnerIndex && gameFinished
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-secondary text-foreground hover:bg-secondary/80'
                        } ${gameFinished ? 'cursor-default' : ''}`}
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
                  <td className="p-2 text-sm text-muted-foreground">
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
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="p-2 text-sm font-bold text-foreground">Total</td>
                {totals.map((total, i) => (
                  <td
                    key={i}
                    className={`p-2 text-center font-display text-xl font-bold ${total === Math.max(...totals) ? 'text-red-600' : 'text-foreground'}`}
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
                  className={`flex items-center gap-3 p-4 rounded-2xl transition-all border-2 shadow-sm ${
                    rank === 1
                      ? 'bg-gradient-to-br from-yellow-200/40 via-amber-100/25 to-yellow-100/20 border-[hsl(45,100%,55%)] shadow-[0_6px_18px_-8px_hsl(45,100%,55%/0.35)]'
                      : rank === 2
                      ? 'bg-gradient-to-br from-zinc-200/40 via-zinc-100/25 to-white/20 border-[hsl(0,0%,70%)] shadow-[0_6px_18px_-8px_hsl(0,0%,70%/0.3)]'
                      : rank === 3
                      ? 'bg-gradient-to-br from-amber-200/30 via-orange-200/20 to-amber-100/15 border-[hsl(30,70%,45%)] shadow-[0_6px_18px_-8px_hsl(30,70%,45%/0.3)]'
                      : 'bg-secondary/50 border-border'
                  }`}
                >
                  {getRankBadge(rank)}
                  <PlayerAvatar name={player.name} size="sm" isWinner={rank === 1} />
                  <span className={`font-semibold flex-1 ${rank === 1 ? 'text-yellow-700' : rank === 2 ? 'text-gray-700' : rank === 3 ? 'text-amber-700' : 'text-foreground'}`}>
                    {player.name}
                  </span>
                  <span className={`font-display font-bold ${rank === 1 ? 'text-yellow-600' : rank === 2 ? 'text-gray-600' : rank === 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {total} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
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
      </main>

      {/* Numpad Modal */}
      {currentCell && (
        <Numpad
          value={numpadValue}
          onChange={setNumpadValue}
          onEnter={handleNumpadEnter}
          onClose={() => setCurrentCell(null)}
        />
      )}
    </div>
  );
}
