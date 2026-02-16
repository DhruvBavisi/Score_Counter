import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, Trophy, TrendingDown, Check, Plus, Crown, Medal, Play, ChevronDown, Settings, RotateCcw, LogOut, Edit, Save, X, Gamepad2 } from 'lucide-react';
import { useGame, Player } from '@/contexts/GameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Numpad } from '@/components/Numpad';
import { Confetti } from '@/components/Confetti';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
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

interface RankingPlayer {
  player: Player;
  total: number;
  rank: number;
}

// Draft Interface
interface DraftGame {
  matchName: string;
  selectedPlayers: Player[];
  scores: number[][];
  inactivePlayers: string[];
  timestamp: number;
  gameStarted: boolean;
  gameFinished: boolean;
  winnerRule: 'highest' | 'lowest';
  numRounds: number;
  gameType?: string;
  scoringSystem?: 'standard' | 'progressive' | 'dynamic' | 'custom';
  penaltyMode?: boolean;
  customPoints?: number[];
  predictions?: (number | null)[][];
  results?: (boolean | null)[][];
}

export default function NewMatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { players: allPlayers, addPlayer, addGame } = useGame();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastRowRef = useRef<HTMLTableRowElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGroups, setShowGroups] = useState(false);
  const [isNewPlayerNameFocused, setIsNewPlayerNameFocused] = useState(false);
  const [isNewPlayerGroupFocused, setIsNewPlayerGroupFocused] = useState(false);

  // Scoreboard state
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState<number[][]>([]);
  const [currentCell, setCurrentCell] = useState<{ row: number; col: number; type: 'prediction' | 'points' | 'score' | 'customPoint' } | null>(null);
  const [numpadValue, setNumpadValue] = useState('');
  const [gameFinished, setGameFinished] = useState(false);
  const [inactivePlayers, setInactivePlayers] = useState<string[]>([]);
  const [menuTarget, setMenuTarget] = useState<string | null>(null);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);

  // Setup state
  const [winnerRule, setWinnerRule] = useState<'highest' | 'lowest'>('highest');
  const [numRounds, setNumRounds] = useState(5);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [savedScores, setSavedScores] = useState<number[][]>([]);
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);
  const [savedScoringSystem, setSavedScoringSystem] = useState<string>('');
  const [savedPenaltyMode, setSavedPenaltyMode] = useState<boolean>(false);
  const [savedCustomPoints, setSavedCustomPoints] = useState<number[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGroup, setNewPlayerGroup] = useState('');
  const [matchName, setMatchName] = useState('');
  const [gameType, setGameType] = useState<'standard' | 'judgement'>('standard');
  const [scoringSystem, setScoringSystem] = useState<'standard' | 'progressive' | 'dynamic' | 'custom'>('standard');
  const [penaltyMode, setPenaltyMode] = useState(false);
  const [customPoints, setCustomPoints] = useState<(number | null)[]>([null, null, null, null, null]);
  const [predictions, setPredictions] = useState<(number | null)[][]>([]);
  const [results, setResults] = useState<(boolean | null)[][]>([]);

  const calcPoints = (pred: number, correct: boolean, system: string, penalty: boolean, custom: (number | null)[]) => {
    const m = correct ? 1 : (penalty ? -1 : 0);
    if (!correct && !penalty) return 0;
    if (system === 'standard') return m * (pred === 0 ? 10 : pred * 10);
    if (system === 'progressive') return m * (10 + pred);
    if (system === 'dynamic') {
      if (pred === 0) return m * 10;
      if (pred === 1) return m * 15;
      if (pred === 2) return m * 20;
      return m * (30 + (pred - 3) * 10);
    }
    if (system === 'custom') {
      const getVal = (idx: number) => custom[idx] ?? 0;
      if (pred <= 4) return m * getVal(pred);
      let val = getVal(4);
      const d = [getVal(2) - getVal(1), getVal(3) - getVal(2), getVal(4) - getVal(3)];
      for (let i = 5; i <= pred; i++) val += d[(i - 5) % 3];
      return m * val;
    }
    return 0;
  };

  const recalculateJudgementPoints = (
    currentScores: number[][],
    currentPredictions: (number | null)[][],
    currentResults: (boolean | null)[][],
    playersCount: number
  ) => {
    const newScores: number[][] = [];
    
    for (let r = 0; r < currentScores.length; r++) {
      const roundScores: number[] = [];
      
      for (let c = 0; c < playersCount; c++) {
        const pred = currentPredictions[r]?.[c];
        const result = currentResults[r]?.[c];
        
        // Only recalculate if prediction exists and result is marked
        if (pred !== null && pred !== undefined && result !== null && result !== undefined) {
          const pts = calcPoints(pred, result, scoringSystem, penaltyMode, customPoints);
          roundScores.push(pts);
        } else {
          roundScores.push(currentScores[r]?.[c] || 0);
        }
      }
      
      newScores.push(roundScores);
    }
    
    return newScores;
  };

  // Prevent iOS/mobile swipe-from-left-edge back navigation
  useEffect(() => {
    const shouldPreventSwipe = (gameStarted && !gameFinished) || (!gameStarted && isEditing);
    if (!shouldPreventSwipe) return;
    
    // CSS prevention
    document.documentElement.style.overscrollBehavior = 'none';
    
    // Touch event fallback for older browsers
    let startX = 0;
    const handleTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const handleTouchMove = (e: TouchEvent) => {
      // If swipe starts from the left edge (first 50px)
      if (startX < 50 && e.touches[0].clientX - startX > 10) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.documentElement.style.overscrollBehavior = '';
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameStarted, gameFinished, isEditing]);

  // PlayerList component definition
  function PlayerList({ players, selectedPlayers, onUpdateSelected }: {
    players: Player[];
    selectedPlayers: Player[];
    onUpdateSelected: (players: Player[]) => void;
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
    
    const [openGroup, setOpenGroup] = useState<{ name: string; players: Player[] } | null>(null);
    const [tempSelected, setTempSelected] = useState<string[]>([]);
    const [isClosing, setIsClosing] = useState(false);

    const handleCloseGroup = (onConfirm?: () => void) => {
      setIsClosing(true);
      setTimeout(() => {
        if (onConfirm) onConfirm();
        setOpenGroup(null);
        setIsClosing(false);
      }, 300);
    };
    
    // Pointer-based Drag State for Real-time Reordering
    const [draggingState, setDraggingState] = useState<{
      id: string;
      startIndex: number;
      startY: number;
      currentY: number;
      itemHeight: number;
    } | null>(null);

    const handlePointerDown = (e: React.PointerEvent, id: string, index: number) => {
      const handle = (e.target as HTMLElement).closest('.drag-handle');
      if (!handle) return;
      
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      
      const rect = el.getBoundingClientRect();
      setDraggingState({
        id,
        startIndex: index,
        startY: e.clientY,
        currentY: e.clientY,
        itemHeight: rect.height + 8
      });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!draggingState) return;
      e.preventDefault();
      
      const newY = e.clientY;
      const diff = newY - draggingState.startY;
      const slots = Math.round(diff / draggingState.itemHeight);
      const currentIndex = tempSelected.indexOf(draggingState.id);
      const targetIndex = Math.max(0, Math.min(tempSelected.length - 1, draggingState.startIndex + slots));
      
      if (targetIndex !== currentIndex) {
        const newTemp = [...tempSelected];
        const [removed] = newTemp.splice(currentIndex, 1);
        newTemp.splice(targetIndex, 0, removed);
        setTempSelected(newTemp);
      }
      
      setDraggingState(prev => prev ? ({ ...prev, currentY: newY }) : null);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      setDraggingState(null);
    };

    const getItemStyle = (index: number, id: string) => {
      if (!draggingState) return { touchAction: 'pan-y' } as React.CSSProperties;

      const isDragged = draggingState.id === id;
      
      if (isDragged) {
        // The dragged item follows the cursor, but we need to account for its new index in the list
        // to keep the visual offset relative to its STARTING position.
        const currentIndex = tempSelected.indexOf(id);
        const indexDiff = currentIndex - draggingState.startIndex;
        const visualOffset = (draggingState.currentY - draggingState.startY) - (indexDiff * draggingState.itemHeight);

        return {
          transform: `translateY(${visualOffset}px)`,
          zIndex: 50,
          opacity: 0.7,
          cursor: 'grabbing',
          transition: 'none',
          touchAction: 'none'
        } as React.CSSProperties;
      }

      return {
        touchAction: 'pan-y'
      } as React.CSSProperties;
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {groups.map(([groupName, groupPlayers]) => (
            <button
              key={groupName}
              onClick={() => {
                setOpenGroup({ name: groupName, players: groupPlayers });
                // Initialize tempSelected with current global order for this group's players
                const selectedOrder = selectedPlayers
                  .filter((p) => groupPlayers.some((gp) => gp.id === p.id))
                  .map((p) => p.id);
                setTempSelected(selectedOrder);
              }}
              className="p-4 rounded-2xl border-2 transition-all bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-between"
            >
              <span className="text-sm font-semibold">{groupName}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{groupPlayers.length}</span>
                {selectedPlayers.some((p) => groupPlayers.some((gp) => gp.id === p.id)) && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">
                    {
                      selectedPlayers.filter((p) => groupPlayers.some((gp) => gp.id === p.id)).length
                    }
                  </span>
                )}
              </div>
            </button>
            
          ))}
        </div>

        {openGroup && (
          <Sheet open={!!openGroup} onOpenChange={(open) => {
            if (!open && !isClosing) {
              handleCloseGroup();
            }
          }}>
            <SheetContent 
              side="bottom" 
              className={cn(
                "h-[85vh] p-0 rounded-t-3xl outline-none transition-transform duration-200 ease-in-out",
                isClosing ? "translate-y-full" : "translate-y-0"
              )} 
              hideClose
            >
              <VisuallyHidden>
                <SheetTitle>Select Players for {openGroup.name}</SheetTitle>
              </VisuallyHidden>
              <div className="flex flex-col h-full bg-background">
                <header className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{openGroup.name}</h3>
                    <p className="text-sm text-muted-foreground">{openGroup.players.length} players</p>
                  </div>
                  <button 
                    onClick={() => handleCloseGroup()}
                    className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-all active:translate-y-1"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Selected Players (Draggable) */}
                  <div className="space-y-2 relative">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Selected ({tempSelected.length})</p>
                    <AnimatePresence mode="popLayout">
                      {tempSelected.map((id, index) => {
                        const player = openGroup.players.find(p => p.id === id);
                        if (!player) return null;
                        return (
                          <motion.div
                            key={player.id}
                            layoutId={player.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            style={getItemStyle(index, id)}
                            className="flex items-center gap-2 group"
                          >
                            <div
                              onPointerDown={(e) => handlePointerDown(e, id, index)}
                              onPointerMove={handlePointerMove}
                              onPointerUp={handlePointerUp}
                              onPointerCancel={handlePointerUp}
                              className="flex-1 p-3 rounded-xl border-2 flex items-center gap-3 border-primary bg-primary/10 select-none"
                            >
                              <PlayerAvatar name={player.name} size="sm" />
                              <span className="font-medium text-foreground flex-1 text-left select-none">{player.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="px-2 py-1 rounded-md bg-primary/15 text-primary font-bold text-sm min-w-[2rem] text-center select-none">
                                  {index + 1}
                                </span>
                                <div 
                                  className="drag-handle cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-primary p-3 -mr-2"
                                  style={{ touchAction: 'none' }}
                                >
                                  {/* Thinner equals/hamburger symbol */}
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9h18M3 15h18" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setTempSelected(prev => prev.filter(pid => pid !== id))}
                              className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors shrink-0"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {tempSelected.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4 border-2 border-dashed border-border rounded-xl">No players selected</p>
                    )}
                  </div>

                  {/* Unselected Players */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Available</p>
                    <AnimatePresence mode="popLayout">
                      {openGroup.players
                        .filter(p => !tempSelected.includes(p.id))
                        .map((player) => (
                        <motion.div
                          key={player.id}
                          layoutId={player.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          onClick={() => setTempSelected(prev => [...prev, player.id])}
                          style={{ touchAction: 'pan-y' }}
                          className="w-full p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all flex items-center gap-3 bg-card cursor-pointer"
                        >
                          <div className="w-5" /> {/* Spacer for alignment with drag handle */}
                          <PlayerAvatar name={player.name} size="sm" />
                          <span className="font-medium text-foreground">{player.name}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="p-6 pb-4 bg-gradient-to-t from-background to-transparent">
                  <button
                    onClick={() => {
                      handleCloseGroup(() => {
                        // Remove players of this group from global selection
                        const groupIds = new Set(openGroup.players.map((p) => p.id));
                        const otherSelected = selectedPlayers.filter(p => !groupIds.has(p.id));
                        
                        // Get new selected players in order
                        const newGroupSelected = tempSelected
                          .map(id => openGroup.players.find(p => p.id === id))
                          .filter((p): p is Player => !!p);
                        
                        // Combine: Others + New (Sorted)
                        onUpdateSelected([...otherSelected, ...newGroupSelected]);
                      });
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-bold text-lg shadow-glow active:scale-[0.98] transition-all"
                  >
                    Confirm Selection
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {players.length === 0 && (
          <p className="text-center text-muted-foreground py-6">No players yet. Add some above!</p>
        )}
      </div>
    );
  }

  // Autosave draft logic
  useEffect(() => {
    if (gameStarted && !gameFinished && selectedPlayers.length > 0) {
      const draft: DraftGame = {
        matchName,
        selectedPlayers,
        scores,
        inactivePlayers,
        timestamp: Date.now(),
        gameStarted,
        gameFinished,
        winnerRule,
        numRounds,
        gameType,
        scoringSystem,
        penaltyMode,
        customPoints,
        predictions,
        results
      };
      localStorage.setItem('game_draft', JSON.stringify(draft));
    }
  }, [scores, selectedPlayers, inactivePlayers, matchName, gameStarted, gameFinished, winnerRule, numRounds, gameType, scoringSystem, penaltyMode, customPoints, predictions, results]);

  const clearDraft = () => {
    localStorage.removeItem('game_draft');
  };

  // Load draft on mount if requested
  useEffect(() => {
    const shouldLoadDraft = (location.state as any)?.loadDraft;
    if (shouldLoadDraft) {
      const savedDraft = localStorage.getItem('game_draft');
      if (savedDraft) {
        try {
          const draft: DraftGame = JSON.parse(savedDraft);
          setMatchName(draft.matchName);
          setSelectedPlayers(draft.selectedPlayers);
          setScores(draft.scores);
          setInactivePlayers(draft.inactivePlayers);
          setWinnerRule(draft.winnerRule);
          setNumRounds(draft.numRounds);
          if (draft.gameType) setGameType(draft.gameType as any);
          if (draft.scoringSystem) setScoringSystem(draft.scoringSystem);
          if (draft.penaltyMode !== undefined) setPenaltyMode(draft.penaltyMode);
          if (draft.customPoints) setCustomPoints(draft.customPoints);
          if (draft.predictions) setPredictions(draft.predictions);
          if (draft.results) setResults(draft.results);
          setGameStarted(true);
          setGameFinished(false);
          
          window.history.replaceState({}, document.title);
          toast.success('Resumed draft successfully');
        } catch (e) {
          console.error('Failed to load draft:', e);
          toast.error('Could not load game draft');
        }
      }
    }
  }, [location.state]);

  const toTitleCase = (s: string) =>
    s.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  // Generate unique groups from all players
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    allPlayers.forEach(player => {
      if (player.group && player.group.trim()) {
        groups.add(player.group);
      }
    });
    return Array.from(groups).sort();
  }, [allPlayers]);
  const toggleInactive = (id: string) =>
    setInactivePlayers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const prevRoundsCount = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Only scroll to bottom if rounds were actually added (not initial start)
    if (scores.length > prevRoundsCount.current && prevRoundsCount.current > 0) {
      el.scrollTop = el.scrollHeight;
    } else if (scores.length > 0 && prevRoundsCount.current === 0) {
      // On initial start, ensure we are at the top
      el.scrollTop = 0;
    }
    prevRoundsCount.current = scores.length;
  }, [scores.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (!currentCell) return;
      const target = e.target as HTMLElement;
      // Check if click is inside numpad
      if (target.closest('#numpad-panel')) return;
      
      // Check if click is on a cell button (or its children)
      // We check for the data-row attribute which our cell buttons have
      if (target.closest('button[data-row]')) return;

      // If neither, close numpad
      setCurrentCell(null);
    };

    if (currentCell) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
  }, [currentCell]);

  // Handle game resumption from history
  useEffect(() => {
    const gameData = (location.state as any)?.gameData;
    if (gameData) {
      // Map names back to players or create temp players
      const resumedPlayers = gameData.players.map((name: string) => {
        const existing = allPlayers.find(p => p.name === name);
        if (existing) return existing;
        return {
          id: `temp-${name}-${Date.now()}`,
          name,
          createdAt: new Date()
        };
      });

      setSelectedPlayers(resumedPlayers);
      setScores(gameData.rounds);
      setWinnerRule(gameData.winnerRule);
      setMatchName(gameData.matchName || '');
      setGameStarted(true);
      setGameFinished(false);
      
      // Clear location state to avoid re-initializing on refresh
      window.history.replaceState({}, document.title);
      toast.success('Resumed game from history');
    }
  }, [location.state, allPlayers]);

  const togglePlayer = (player: Player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  const removePlayer = (playerId: string) => {
    const index = selectedPlayers.findIndex((p) => p.id === playerId);
    if (index === -1) return;
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setScores((prev) => prev.map((round) => round.filter((_, i) => i !== index)));
    setPredictions((prev) => prev.map((round) => round.filter((_, i) => i !== index)));
    setResults((prev) => prev.map((round) => round.filter((_, i) => i !== index)));
    setInactivePlayers((prev) => prev.filter((id) => id !== playerId));
    setCurrentCell((prev) => {
      if (!prev) return prev;
      if (prev.col === index) return null;
      if (prev.col > index) return { ...prev, col: prev.col - 1 };
      return prev;
    });
  };

  const handleAddNewPlayer = () => {
    if (addPlayer(newPlayerName, newPlayerGroup || undefined)) {
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

    if (isEditing && savedScores.length > 0) {
      // Map previous data to players by ID
      const playerScoresMap = new Map<string, number[]>();
      const playerPredictionsMap = new Map<string, (number | null)[]>();
      const playerResultsMap = new Map<string, (boolean | null)[]>();
      
      const sourcePlayers = savedPlayers.length > 0 ? savedPlayers : selectedPlayers; 
      
      sourcePlayers.forEach((player, index) => {
        playerScoresMap.set(player.id, savedScores.map(round => round[index]));
        playerPredictionsMap.set(player.id, predictions.map(round => round[index]));
        playerResultsMap.set(player.id, results.map(round => round[index]));
      });

      const roundsCount = savedScores.length;
      const newScores: number[][] = [];
      const newPredictions: (number | null)[][] = [];
      const newResults: (boolean | null)[][] = [];

      for (let r = 0; r < roundsCount; r++) {
        const scoreRound: number[] = [];
        const predRound: (number | null)[] = [];
        const resRound: (boolean | null)[] = [];

        selectedPlayers.forEach(player => {
          scoreRound.push(playerScoresMap.get(player.id)?.[r] ?? 0);
          predRound.push(playerPredictionsMap.get(player.id)?.[r] ?? null);
          resRound.push(playerResultsMap.get(player.id)?.[r] ?? null);
        });

        newScores.push(scoreRound);
        newPredictions.push(predRound);
        newResults.push(resRound);
      }
      
      let finalScores = newScores;

      // Detect settings changes for Judgement game
      if (gameType === 'judgement') {
        const customChanged = JSON.stringify(savedCustomPoints) !== JSON.stringify(customPoints);
        const settingsChanged = 
          savedScoringSystem !== scoringSystem || 
          savedPenaltyMode !== penaltyMode || 
          (scoringSystem === 'custom' && customChanged);

        if (settingsChanged) {
          finalScores = recalculateJudgementPoints(newScores, newPredictions, newResults, selectedPlayers.length);
          toast.info('Points recalculated based on new settings');
        }
      }

      // If rounds increased/decreased
      if (numRounds > finalScores.length) {
        const extraRounds = numRounds - finalScores.length;
        const extraScores = Array(extraRounds).fill(null).map(() => Array(selectedPlayers.length).fill(0));
        const extraPreds = Array(extraRounds).fill(null).map(() => Array(selectedPlayers.length).fill(null));
        const extraResults = Array(extraRounds).fill(null).map(() => Array(selectedPlayers.length).fill(null));
        
        setScores([...finalScores, ...extraScores]);
        setPredictions([...newPredictions, ...extraPreds]);
        setResults([...newResults, ...extraResults]);
      } else {
        setScores(finalScores.slice(0, numRounds));
        setPredictions(newPredictions.slice(0, numRounds));
        setResults(newResults.slice(0, numRounds));
      }

      setIsEditing(false);
      clearDraft();
    } else {
      // New game
      setScores(Array(numRounds).fill(null).map(() => Array(selectedPlayers.length).fill(0)));
      if (gameType === 'judgement') {
        setPredictions(Array(numRounds).fill(null).map(() => Array(selectedPlayers.length).fill(null)));
        setResults(Array(numRounds).fill(null).map(() => Array(selectedPlayers.length).fill(null)));
      }
      clearDraft(); // Clear any previous draft when starting a fresh game
    }
    setGameStarted(true);
  };

  const openCell = (r: number, c: number) => {
    if (gameType !== 'judgement') {
      openNumpad(r, c);
      return;
    }

    if (results[r]?.[c] !== undefined && results[r]?.[c] !== null) {
      // If result already marked, clicking prediction cell does nothing
      return;
    }

    setCurrentCell({ row: r, col: c, type: 'prediction' });
    setNumpadValue(predictions[r]?.[c]?.toString() || '');
    scrollActiveCellIntoView(r, c, 'prediction');
  };

  const openResultMarking = (r: number, c: number) => {
    if (predictions[r]?.[c] === undefined || predictions[r]?.[c] === null) return;
    setCurrentCell({ row: r, col: c, type: 'points' });
    setNumpadValue(''); // Clear numpad value so it shows result marking buttons
    scrollActiveCellIntoView(r, c, 'points');
  };

  const handleMarkResult = (correct: boolean) => {
    if (!currentCell) return;
    const { row, col } = currentCell;
    const pred = predictions[row][col];
    if (pred === null || pred === undefined) return;

    const pts = calcPoints(pred, correct, scoringSystem, penaltyMode, customPoints);

    setResults(p => {
      const n = [...p];
      n[row] = [...(n[row] || [])];
      n[row][col] = correct;
      return n;
    });

    setScores(p => {
      const n = [...p];
      n[row] = [...(n[row] || [])];
      n[row][col] = pts;
      return n;
    });

    // Move to next points cell in same round
    for (let nextCol = col + 1; nextCol < selectedPlayers.length; nextCol++) {
      if (!inactivePlayers.includes(selectedPlayers[nextCol].id)) {
        setCurrentCell({ row, col: nextCol, type: "points" });
        setNumpadValue('');
        scrollActiveCellIntoView(row, nextCol, "points");
        return;
      }
    }

    setCurrentCell(null);
  };

  const openNumpad = (row: number, col: number) => {
    const playerId = selectedPlayers[col]?.id;
    if (playerId && inactivePlayers.includes(playerId)) return;
    setCurrentCell({ row, col, type: 'score' });
    setNumpadValue(scores[row][col].toString());
    scrollActiveCellIntoView(row, col, 'score');
  };

  const handleNumpadChange = (next: string) => {
    setNumpadValue(next);
    if (!currentCell) return;

    if (gameType === 'judgement') {
      if (currentCell.type === 'prediction') {
        const val = next === '' ? null : parseInt(next, 10);
        if (next !== '' && isNaN(val as number)) return;
        
        setPredictions(p => {
          const n = [...p];
          n[currentCell.row] = [...(n[currentCell.row] || [])];
          n[currentCell.row][currentCell.col] = val;
          return n;
        });
      }
      return;
    }

    const val = next === '' ? 0 : parseInt(next, 10);
    if (isNaN(val)) return;
    const updated = [...scores];
    updated[currentCell.row][currentCell.col] = val;
    setScores(updated);
  };

    useEffect(() => {
    if (gameStarted && gameType === 'judgement' && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [gameStarted, gameType]);

  const scrollActiveCellIntoView = (row: number, col: number, type: string, forceScrollRight?: boolean) => {
    const container = scrollRef.current;
    const cell = document.querySelector(
      `button[data-row="${row}"][data-col="${col}"][data-type="${type}"]`
    ) as HTMLButtonElement | null;

    if (!container) return;

    if (forceScrollRight) {
      container.scrollTo({
        left: container.scrollWidth,
        behavior: 'smooth'
      });
      return;
    }

    if (!cell) return;

    const containerRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const stickyColumnWidth = 64;
    const stickyTotalWidth = gameType === 'judgement' ? 80 : 0;
    const padding = 16;

    // Horizontal scroll - align to show full cell at the end
    if (cellRect.right > containerRect.right - stickyTotalWidth - padding) {
      // Scroll so cell's right edge aligns with visible area's right edge (minus total column and padding)
      const targetScrollLeft = container.scrollLeft + (cellRect.right - (containerRect.right - stickyTotalWidth - padding));
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    } else if (cellRect.left < containerRect.left + stickyColumnWidth + padding) {
      // Scroll so cell's left edge is visible
      const targetScrollLeft = container.scrollLeft - (containerRect.left + stickyColumnWidth + padding - cellRect.left);
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }

    // Vertical scroll with smooth behavior
    const panel = document.getElementById('numpad-panel');
    const panelHeight = panel ? panel.offsetHeight : 350;
    
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportOffsetTop = window.visualViewport?.offsetTop || 0;
    
    const safeBottom = viewportHeight + viewportOffsetTop - panelHeight - 40;
    const stickyHeaderHeight = 40;

    if (cellRect.bottom > safeBottom) {
       const diff = cellRect.bottom - safeBottom;
       container.scrollTo({
         top: container.scrollTop + diff,
         behavior: 'smooth'
       });
    } 
    else if (cellRect.top < containerRect.top + stickyHeaderHeight) {
       const diff = (containerRect.top + stickyHeaderHeight) - cellRect.top;
       container.scrollTo({
         top: container.scrollTop - diff,
         behavior: 'smooth'
       });
    }
  };

  // Auto-scroll when cell is selected (and Numpad appears)
  useEffect(() => {
    if (currentCell) {
      // Small delay to allow Numpad to mount/render
      const timer = setTimeout(() => {
        scrollActiveCellIntoView(currentCell.row, currentCell.col, currentCell.type);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentCell]);

  const moveCursor = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!currentCell) return;
    const { row, col, type } = currentCell;
    const maxRow = scores.length - 1;
    const maxCol = selectedPlayers.length - 1;

    if (gameType === 'judgement') {
      if (dir === 'up') {
        if (type === 'points') {
          setCurrentCell({ row, col, type: 'prediction' });
          setNumpadValue(predictions[row][col]?.toString() || '');
        } else if (row > 0) {
          setCurrentCell({ row: row - 1, col, type: 'points' });
          setNumpadValue('');
        }
      } else if (dir === 'down') {
        if (type === 'prediction') {
          setCurrentCell({ row, col, type: 'points' });
          setNumpadValue('');
        } else if (row < maxRow) {
          setCurrentCell({ row: row + 1, col, type: 'prediction' });
          setNumpadValue(predictions[row + 1][col]?.toString() || '');
        }
      } else if (dir === 'left') {
        let next = col - 1;
        while (next >= 0 && inactivePlayers.includes(selectedPlayers[next].id)) next--;
        if (next >= 0) {
          setCurrentCell({ row, col: next, type });
          setNumpadValue(type === 'prediction' ? predictions[row][next]?.toString() || '' : '');
          scrollActiveCellIntoView(row, next, type);
        }
      } else if (dir === 'right') {
        let next = col + 1;
        while (next <= maxCol && inactivePlayers.includes(selectedPlayers[next].id)) next++;
        if (next <= maxCol) {
          setCurrentCell({ row, col: next, type });
          setNumpadValue(type === 'prediction' ? predictions[row][next]?.toString() || '' : '');
          scrollActiveCellIntoView(row, next, type);
        }
      }
      return;
    }

    if (dir === 'up' && row > 0) {
      setCurrentCell({ row: row - 1, col, type: 'score' });
      setNumpadValue(scores[row - 1][col].toString());
    } else if (dir === 'down' && row < maxRow) {
      setCurrentCell({ row: row + 1, col, type: 'score' });
      setNumpadValue(scores[row + 1][col].toString());
    } else if (dir === 'left') {
      let next = col - 1;
      while (next >= 0 && inactivePlayers.includes(selectedPlayers[next].id)) next--;
      if (next >= 0) {
        setCurrentCell({ row, col: next, type: 'score' });
        setNumpadValue(scores[row][next].toString());
        scrollActiveCellIntoView(row, next, 'score');
      }
    } else if (dir === 'right') {
      let next = col + 1;
      while (next <= maxCol && inactivePlayers.includes(selectedPlayers[next].id)) next++;
      if (next <= maxCol) {
        setCurrentCell({ row, col: next, type: 'score' });
        setNumpadValue(scores[row][next].toString());
        scrollActiveCellIntoView(row, next, 'score');
      }
    }
  };

  const handleNumpadEnter = () => {
    if (!currentCell) return;

    if (currentCell.type === 'customPoint') {
      const { col } = currentCell;
      const val = numpadValue === '' ? null : parseInt(numpadValue, 10);
      const newCustom = [...customPoints];
      newCustom[col] = val;
      setCustomPoints(newCustom);
      
      if (col < 4) {
        setCurrentCell({ row: 0, col: col + 1, type: 'customPoint' });
        setNumpadValue(customPoints[col + 1] === null ? '' : customPoints[col + 1]!.toString());
      } else {
        setCurrentCell(null);
      }
      return;
    }

    if (gameType === "judgement") {
      const { row, col, type } = currentCell;
      const value = numpadValue === '' ? null : parseInt(numpadValue, 10);

      if (type === "prediction") {
        if (numpadValue !== '' && isNaN(value as number)) return;
        
        setPredictions((p) => {
          const n = [...p];
          n[row] = [...(n[row] || [])];
          n[row][col] = value;
          return n;
        });

        // Move to next prediction cell in same round
        for (let nextCol = col + 1; nextCol < selectedPlayers.length; nextCol++) {
          if (!inactivePlayers.includes(selectedPlayers[nextCol].id)) {
            setCurrentCell({ row, col: nextCol, type: "prediction" });
            setNumpadValue(predictions[row]?.[nextCol]?.toString() || "");
            scrollActiveCellIntoView(row, nextCol, "prediction");
            return;
          }
        }

        // If we reached the end but some cells are still empty, wrap around to the first empty cell
        for (let nextCol = 0; nextCol <= col; nextCol++) {
          if (!inactivePlayers.includes(selectedPlayers[nextCol].id) && 
              (predictions[row]?.[nextCol] === null || predictions[row]?.[nextCol] === undefined)) {
            setCurrentCell({ row, col: nextCol, type: "prediction" });
            setNumpadValue("");
            scrollActiveCellIntoView(row, nextCol, "prediction");
            return;
          }
        }

        setCurrentCell(null);
        // Scroll to the end (Total column) when all predictions are filled
        scrollActiveCellIntoView(row, col, type, true);
      } else if (type === "points") {
        openResultMarking(row, col);
      }
      return;
    }

    const value = numpadValue === '' ? 0 : parseInt(numpadValue, 10);
    if (isNaN(value)) return;

    const newScores = [...scores];
    newScores[currentCell.row][currentCell.col] = value;
    setScores(newScores);

    // Move to next cell
    const { row, col } = currentCell;
    const numPlayers = selectedPlayers.length;
    const isActive = (idx: number) => {
      const id = selectedPlayers[idx]?.id;
      return id ? !inactivePlayers.includes(id) : false;
    };
    for (let c = col + 1; c < numPlayers; c++) {
      if (isActive(c)) {
        setCurrentCell({ row, col: c, type: "score" });
        setNumpadValue(newScores[row][c].toString());
        scrollActiveCellIntoView(row, c, "score");
        return;
      }
    }
    for (let r = row + 1; r < newScores.length; r++) {
      for (let c = 0; c < numPlayers; c++) {
        if (isActive(c)) {
          setCurrentCell({ row: r, col: c, type: "score" });
          setNumpadValue(newScores[r][c].toString());
          scrollActiveCellIntoView(r, c, "score");
          return;
        }
      }
    }
    setCurrentCell(null);
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
    const filteredRounds = scores.filter((round) => !round.every((v) => v === 0));
    const totals = selectedPlayers.map((_, playerIndex) =>
      filteredRounds.reduce((sum, round) => sum + (round[playerIndex] || 0), 0)
    );
    addGame({
      players: selectedPlayers.map((p) => p.name),
      rounds: filteredRounds,
      totals,
      winnerRule,
      matchName,
    });
    setGameFinished(true);
    clearDraft();
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
      <div 
        className="min-h-screen bg-background safe-top safe-bottom"
        style={isEditing ? { overscrollBehavior: 'none', overscrollBehaviorX: 'none' } : {}}
      >
        {/* Header */}
        <header className="px-8 py-5 flex items-center gap-4 border-b border-border">
          {!isEditing && (
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
          )}
          <h1 className="font-display text-lg font-bold text-foreground">
            {isEditing ? 'Edit Game' : 'New Match'}
          </h1>
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
                  setMatchName('Judgement');
                  setGameType('judgement');
                  toast.success('Judgement selected');
                }}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  matchName === 'Judgement'
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/40 bg-primary/10 hover:bg-primary/15'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Judgement</p>
                  <p className="text-xs text-muted-foreground mt-1">Highest score wins</p>
                </div>
              </button>
            </div>

            <AnimatePresence>
              {matchName === 'Judgement' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 mt-4 p-4 rounded-xl bg-secondary/50 border border-border">
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Scoring System</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {['standard', 'progressive', 'dynamic', 'custom'].map((s) => (
                          <div key={s} className="flex flex-col gap-1.5">
                            <button
                              onClick={() => setScoringSystem(s as any)}
                              className={`p-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                                scoringSystem === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                              }`}
                            >
                              {s === 'dynamic' ? 'Dynamic' : s}
                            </button>
                            <p className="text-[10px] text-muted-foreground text-center leading-tight px-1">
                              {s === 'standard' ? 'Earn 10 pts for 0 bids, or 10x your bid for success.' :
                               s === 'progressive' ? 'Earn 10 pts for 0 bids, or 10 + your bid for success.' :
                               s === 'dynamic' ? 'Base 10, 15, 20 pts, then +10 for each extra bid.' :
                               'Set specific points for 0, 1, 2, 3, and 4 successful bids.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">Negative Points</span>
                          <span className="text-[10px] text-muted-foreground">Deduct points for wrong predictions instead of 0.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={penaltyMode}
                            onChange={(e) => setPenaltyMode(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>

                    {scoringSystem === 'custom' && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Custom Points</h3>
                        <div className="grid grid-cols-5 gap-2">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col gap-1">
                              <span className="text-[10px] text-center text-muted-foreground">Pred {i}</span>
                              <button
                                onClick={() => {
                                  setCurrentCell({ row: 0, col: i, type: 'customPoint' });
                                  setNumpadValue(customPoints[i] === 0 && i === 0 ? '0' : (customPoints[i] || '').toString());
                                }}
                                className={`w-full py-2 rounded-lg bg-background border border-border text-center text-sm focus:border-primary outline-none ${currentCell?.type === 'customPoint' && currentCell?.col === i ? 'ring-2 ring-primary border-primary' : ''}`}
                              >
                                {currentCell?.type === 'customPoint' && currentCell?.col === i
                                  ? (numpadValue === '' ? (customPoints[i] === null ? '-' : customPoints[i]) : numpadValue)
                                  : (customPoints[i] === null ? '-' : customPoints[i])}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
  <div className="space-y-4 mb-4">

    {/* Player Name + Add Button */}
    <div className="flex gap-3 items-end">

  <div className="flex-1 relative group">
    <input
        type="text"
        value={newPlayerName}
        onChange={(e) => setNewPlayerName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAddNewPlayer()}
        onFocus={() => setIsNewPlayerNameFocused(true)}
        onBlur={() => setIsNewPlayerNameFocused(false)}
        placeholder="Enter player name"
        className="
          w-full px-5 py-3 rounded-2xl
          bg-secondary text-foreground
          placeholder:text-muted-foreground
          border border-border
          focus:border-primary focus:ring-2 focus:ring-primary/30
          outline-none transition-all
          font-display text-base shadow-sm
        "
      />
  </div>

  <button
    onClick={handleAddNewPlayer}
    className="
      w-11 h-11 rounded-xl
      flex items-center justify-center
      bg-gradient-primary text-primary-foreground
      shadow-glow
      hover:scale-105 active:scale-95
      transition-transform
    "
    title="Add Player"
  >
    <Plus className="w-5 h-5" />
  </button>

</div>

  </div>

    {/* Group Selector */}
  <div className="relative">

    <div className="relative group w-72">
      <input
        type="text"
        value={newPlayerGroup}
        onChange={(e) => {
          setNewPlayerGroup(e.target.value);
          setShowGroups(true);
        }}
        onFocus={() => {
          setShowGroups(true);
          setIsNewPlayerGroupFocused(true);
        }}
        onBlur={() => {
          // Slight timeout to allow onMouseDown to fire on dropdown items
          setTimeout(() => {
            setShowGroups(false);
            setIsNewPlayerGroupFocused(false);
          }, 200);
        }}
        onClick={() => setShowGroups(true)}
        placeholder="Select or create a group"
        className="
          w-full px-5 py-3 pr-12 rounded-2xl mb-3
          bg-secondary text-foreground 
          placeholder:text-muted-foreground 
          border border-border 
          focus:border-primary focus:ring-2 focus:ring-primary/30 
          outline-none transition-all 
          font-display text-base shadow-sm
          appearance-none 
          [&::-webkit-calendar-picker-indicator]:hidden
          [&::-webkit-list-button]:hidden
        "
      />

      <ChevronDown className={`absolute right-4 top-1/2 -translate-y-[70%] w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-all duration-200 ${showGroups ? 'rotate-180' : ''}`} />
    </div>

    {showGroups && (
      <div className="absolute z-50 mt-[-8px] w-72 rounded-2xl border border-border bg-background shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="max-h-56 overflow-y-auto">
          {uniqueGroups
            .filter(group => group.toLowerCase().includes(newPlayerGroup.toLowerCase()))
            .length > 0 ? (
            uniqueGroups
              .filter(group => group.toLowerCase().includes(newPlayerGroup.toLowerCase()))
              .map(group => (
                <button
                  key={group}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevents input blur
                    setNewPlayerGroup(group);
                    setShowGroups(false);
                  }}
                  className="
                    w-full text-left px-4 py-3
                    font-display text-sm
                    text-foreground
                    hover:bg-primary/10
                    transition-colors
                  "
                >
                  {group}
                </button>
              ))
            ) : (
              newPlayerGroup.trim() !== '' && (
                <div className="px-4 py-3 text-sm text-muted-foreground font-display italic">
                  Create new group "{newPlayerGroup}"
                </div>
              )
            )}
        </div>
      </div>
    )}
  </div>  



            {/* Player List */}
            <PlayerList
              players={allPlayers}
              selectedPlayers={selectedPlayers}
              onUpdateSelected={setSelectedPlayers}
            />
          </section>
        </main>

        {/* Start Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 pb-4 bg-gradient-to-t from-background to-transparent">
          <button
            onClick={startGame}
            disabled={selectedPlayers.length < 2}
            className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
          >
            <Play className="w-5 h-5" />
            {isEditing ? 'Resume Game' : 'Start Game'}
          </button>
        </div>

        {currentCell && currentCell.type === 'customPoint' && (
          <Numpad
            value={numpadValue}
            onChange={setNumpadValue}
            onEnter={handleNumpadEnter}
            onClose={() => setCurrentCell(null)}
            type={currentCell.type}
            gameType={gameType}
          />
        )}
      </div>
    );
  }

  // Scoreboard View
  return (
    <div 
      className="min-h-screen bg-background safe-top safe-bottom flex flex-col"
      style={{ overscrollBehavior: 'none', overscrollBehaviorX: 'none' }}
    >
      {gameFinished && <Confetti />}

      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-lg font-bold text-foreground pl-2">
            {matchName || 'Match Score'}
          </h1>
        </div>

        {!gameFinished && (
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowFinishDialog(true)}
              className="p-2 rounded-xl text-white shadow-glow-sm hover:bg-secondary transition-all active:scale-90"
              title="Finish Game"
            >
              <Check className="w-6 h-6 stroke-[2.5]" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                  <Settings className="w-6 h-6 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-border/50 bg-background/95 backdrop-blur-sm">
              
              <DropdownMenuItem
                onClick={() => setShowNewGameDialog(true)}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-semibold text-foreground hover:bg-primary/10 focus:bg-primary/10 transition-colors mt-1"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15 text-primary">
                    <Gamepad2 className="w-5 h-5"/>
                </div>
                <div className="flex flex-col">
                  <span>New Game</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Start a fresh match</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  setIsEditing(true);
                  setSavedScores(scores);
                  setSavedPlayers(selectedPlayers);
                  setSavedScoringSystem(scoringSystem);
                  setSavedPenaltyMode(penaltyMode);
                  setSavedCustomPoints([...customPoints]);
                  setGameStarted(false);
                }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-semibold text-foreground hover:bg-primary/10 focus:bg-primary/10 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15 text-primary">
                  <Edit className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span>Edit Game</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Change players or rounds</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => setShowRestartDialog(true)}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-semibold text-orange-500 hover:bg-orange-500/10 focus:bg-orange-500/10 transition-colors mt-1"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/15 text-orange-500">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span>Restart Game</span>
                  <span className="text-[10px] text-orange-500/70 font-normal">Reset all scores to zero</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setShowExitDialog(true)}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer font-bold text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 transition-colors mt-1"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/15 text-red-500">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-red-600">Exit Game</span>
                  <span className="text-[10px] text-red-500/70 font-normal">Discard game and go back</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>

      {/* Restart Game Dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg border-2 border-border/50 shadow-2xl animate-in fade-in zoom-in duration-200">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-500 mb-2">
              <RotateCcw className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-display font-bold text-center">Restart Game?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              This will reset all current scores to zero. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 mt-6 sm:space-x-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-2 font-bold text-base hover:bg-secondary mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setScores(Array(numRounds).fill(null).map(() => Array(selectedPlayers.length).fill(0)));
                setGameFinished(false);
                toast.success('Game restarted');
              }}
              className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base border-none shadow-lg shadow-orange-500/20 mt-0"
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Game Dialog */}
      <AlertDialog open={showNewGameDialog} onOpenChange={setShowNewGameDialog}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg border-2 border-border/50 shadow-2xl animate-in fade-in zoom-in duration-200">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-primary mb-2 relative">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-display font-bold text-center">Start New Game?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              The current session will end and will not be saved. Are you sure you want to start a fresh match?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 mt-6 sm:space-x-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-2 font-bold text-base hover:bg-secondary mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setMatchName('');
                setSelectedPlayers([]);
                setScores([]);
                setInactivePlayers([]);
                setWinnerRule('highest');
                setNumRounds(5);
                setIsEditing(false);
                setGameStarted(false);
                setGameFinished(false);
                clearDraft();
                toast.success('Started new game');
              }}
              className="flex-1 h-12 rounded-2xl bg-gradient-primary text-primary-foreground text-base font-bold border-none shadow-glow active:scale-[0.98] transition-all mt-0"
            >
              New Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Game Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg border-2 border-border/50 shadow-2xl animate-in fade-in zoom-in duration-200">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center text-red-500 mb-2">
              <LogOut className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-display font-bold text-center text-red-600">Exit Game?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base text-red-500/80">
              Your current game progress will be lost. Are you sure you want to go back to the home screen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 mt-6 sm:space-x-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-2 font-bold text-base hover:bg-secondary mt-0">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                navigate('/');
                clearDraft();
              }}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-base font-bold border-none shadow-lg shadow-red-500/20 mt-0"
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finish Game Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg border-2 border-border/50 shadow-2xl animate-in fade-in zoom-in duration-200">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-primary mb-2">
              <Trophy className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-display font-bold text-center">Finish Match?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              Are you ready to see the final results? This will crown the winner and finalize the scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-3 mt-6 sm:space-x-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-2 font-bold hover:bg-secondary mt-0">
              Keep Playing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={finishGame}
              className="flex-1 h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-bold border-none shadow-glow active:scale-[0.98] transition-all mt-0"
            >
              Finish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 p-6 page-enter space-y-6 pb-6">
        {/* Score Table */}
        <div className="overflow-auto -mx-6 px-0 pb-0 mobile-hide-scrollbar relative max-h-[70vh] bg-background" 
             ref={scrollRef}
             style={{ scrollBehavior: 'smooth' }}>
          <table className="w-full border-separate min-w-max no-border-spacing">
            <thead className="sticky top-0 z-50 bg-background shadow-none">
              <tr>
                <th className="p-2 text-center text-xs text-muted-foreground font-normal sticky left-0 top-0 z-50 bg-background border-b border-border border-r-2 shadow-lg">Round</th>
                {selectedPlayers.map((player, i) => (
                  <th
                    key={player.id}
                    className={`p-2 text-center min-w-[80px] sticky top-0 z-40 bg-background border-b border-border ${currentCell?.col === i ? 'text-primary' : 'text-foreground'}`}
                  >
                    <div className="flex flex-col items-center gap-1 no-select">  
                      {i === winnerIndex && gameFinished && <Crown className="w-4 h-4 crown-bounce text-yellow-500" />}
                      <PlayerAvatar
                        className= "no-select"
                        name={player.name}
                        size="sm"
                        isWinner={i === winnerIndex && gameFinished}
                        onMouseDown={() => {
                            if (longPressTimerRef.current) {
                              window.clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          // longPressTimerRef.current = window.setTimeout(() => toggleInactive(player.id), 350);
                        }}
                        onMouseUp={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onMouseLeave={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onTouchStart={() => {
                          if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                          // longPressTimerRef.current = window.setTimeout(() => toggleInactive(player.id), 350);
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                      />
                      <DropdownMenu open={menuTarget === player.id} onOpenChange={(open) => setMenuTarget(open ? player.id : null)}>
                        <DropdownMenuTrigger asChild>
                          <span
                            className="text-xs font-medium truncate max-w-[70px]"
                            onMouseDown={() => {
                              if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                              // longPressTimerRef.current = window.setTimeout(() => toggleInactive(player.id), 350);
                            }}
                            onMouseUp={() => {
                              if (longPressTimerRef.current) {
                                window.clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                              }
                            }}
                            onMouseLeave={() => {
                              if (longPressTimerRef.current) {
                                window.clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                              }
                            }}
                            
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setMenuTarget(player.id);
                            }}
                            onClick={(e) => e.preventDefault()}
                            onPointerDown={(e) => e.preventDefault()}
                          >
                            {player.name}
                          </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              setInactivePlayers((prev) =>
                                prev.includes(player.id) ? prev.filter((id) => id !== player.id) : [...prev, player.id],
                              )
                            }
                          >
                            {inactivePlayers.includes(player.id) ? 'Resume' : 'Stop'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => removePlayer(player.id)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </th>
                ))}
                {gameType === 'judgement' && (
                  <th className="sticky right-0 top-0 z-50 bg-background shadow-lg border-l-2 border-border border-b border-border p-2 text-center text-xs text-muted-foreground font-bold">TOTAL</th>
                )}
              </tr>
            </thead>
              <tbody>
                {scores.map((round, rowIndex) => (
                  gameType === 'judgement' ? (
                    <Fragment key={rowIndex}>
                      <tr className={`${currentCell?.row === rowIndex ? 'bg-primary/5' : ''} bg-secondary/50`}>
                        <td className="p-2 text-sm text-muted-foreground text-center sticky left-0 z-30 bg-background border-r-2 border-border shadow-lg">R{rowIndex + 1}</td>
                        {round.map((_, colIndex) => (
                          <td key={colIndex} className="p-1">
                            <button
                              onClick={() => !gameFinished && openCell(rowIndex, colIndex)}
                              disabled={gameFinished || inactivePlayers.includes(selectedPlayers[colIndex].id) || results[rowIndex]?.[colIndex] !== null}
                              className={`w-full h-12 rounded-xl font-display font-bold text-lg transition-all duration-200 ${
                                results[rowIndex]?.[colIndex] === true ? 'bg-green-600/10' : 
                                results[rowIndex]?.[colIndex] === false ? 'bg-red-600/10' : 
                                'bg-secondary'
                              } text-foreground hover:bg-secondary/80 flex items-center justify-center gap-1 ${gameFinished || inactivePlayers.includes(selectedPlayers[colIndex].id) ? 'cursor-default opacity-50' : ''} ${currentCell?.col === colIndex && currentCell?.row === rowIndex && currentCell?.type === 'prediction' ? 'ring-2 ring-primary/50 border-transparent scale-105' : 'scale-100'}`}
                              data-row={rowIndex}
                              data-col={colIndex}
                              data-type="prediction"
                            >
                              {currentCell?.row === rowIndex && currentCell?.col === colIndex && results[rowIndex]?.[colIndex] === null
                                ? (numpadValue === '' ? (predictions[rowIndex]?.[colIndex] ?? '-') : numpadValue)
                                : (predictions[rowIndex]?.[colIndex] ?? '-')}
                              {results[rowIndex]?.[colIndex] === true && <Check className="w-4 h-4 text-green-600" />}
                              {results[rowIndex]?.[colIndex] === false && <X className="w-4 h-4 text-red-600" />}
                            </button>
                          </td>
                        ))}
                        {gameType === 'judgement' && (
                          <td className="p-2 text-center sticky right-0 z-30 bg-background shadow-lg border-l-2 border-border font-bold">
                            <div className="flex flex-col items-center">
                              <span className="text-foreground">
                                {predictions[rowIndex]?.reduce((sum, p) => sum + (p || 0), 0)}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-normal leading-none">
                                ({predictions[rowIndex]?.filter((p) => p !== null && p !== undefined).length || 0}/{selectedPlayers.length})
                              </span>
                            </div>
                          </td>
                        )}
                      </tr>
                      <tr className={`${currentCell?.row === rowIndex ? 'bg-primary/5' : ''} ${
                        selectedPlayers.every((p, idx) => inactivePlayers.includes(p.id) || (predictions[rowIndex]?.[idx] !== null && predictions[rowIndex]?.[idx] !== undefined))
                          ? ""
                          : "opacity-60"
                      } transition-all duration-300`}>
                        <td className="p-2 text-sm text-muted-foreground text-center sticky left-0 z-30 bg-background border-r-2 border-border shadow-lg">R{rowIndex + 1} Pts</td>
                        {round.map((pts, colIndex) => (
                          <td key={colIndex} className="p-1">
                            <button
                              onClick={() => {
                                if (!gameFinished && predictions[rowIndex]?.[colIndex] !== null) {
                                  // Check if all active players in this round have entered predictions
                                  const allPredictionsEntered = selectedPlayers.every((p, idx) => 
                                    inactivePlayers.includes(p.id) || (predictions[rowIndex]?.[idx] !== null && predictions[rowIndex]?.[idx] !== undefined)
                                  );
                                  
                                  if (allPredictionsEntered) {
                                    openResultMarking(rowIndex, colIndex);
                                  } else {
                                    toast.error("Finish all bids first!", {
                                      description: "All players must enter their predictions before results can be marked.",
                                      duration: 2000,
                                    });
                                  }
                                }
                              }}
                              disabled={gameFinished || inactivePlayers.includes(selectedPlayers[colIndex].id) || predictions[rowIndex]?.[colIndex] === null}
                              className={`w-full h-12 rounded-xl font-bold transition-all duration-200 ${
                                currentCell?.row === rowIndex && currentCell?.col === colIndex && currentCell?.type === 'points'
                                  ? "ring-2 ring-primary/50 scale-105"
                                  : "scale-100"
                              } ${
                                results[rowIndex]?.[colIndex] === true ? "bg-green-600/10" : 
                                results[rowIndex]?.[colIndex] === false ? "bg-red-600/10" : 
                                "bg-secondary"
                              } ${!selectedPlayers.every((p, idx) => inactivePlayers.includes(p.id) || (predictions[rowIndex]?.[idx] !== null && predictions[rowIndex]?.[idx] !== undefined)) ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-secondary/80"} ${pts > 0 ? "text-green-600 font-bold" : pts < 0 ? "text-red-600 font-bold" : "text-muted-foreground"}`}
                              data-row={rowIndex}
                              data-col={colIndex}
                              data-type="points"
                            >
                              {results[rowIndex]?.[colIndex] !== null && results[rowIndex]?.[colIndex] !== undefined ? (pts > 0 ? "+" : "") + pts : "-"}
                            </button>
                          </td>
                        ))}
                        {gameType === 'judgement' && (
                          <td className="p-2 text-center sticky right-0 z-30 bg-background shadow-lg border-l-2 border-border font-bold">
                            {results[rowIndex]?.some((r) => r !== null && r !== undefined) && (
                              <div className="flex flex-col items-center">
                                <span className="text-green-600">{results[rowIndex]?.filter(Boolean).length || 0}</span>
                                <span className="text-[10px] text-muted-foreground font-normal leading-none">correct</span>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    </Fragment>
                  ) : (
                    <tr key={rowIndex} className={`${currentCell?.row === rowIndex ? 'bg-primary/5' : ''}`}>
                      <td className="p-2 text-sm text-muted-foreground text-center sticky left-0 z-30 bg-background border-r-2 border-border shadow-lg">R{rowIndex + 1}</td>
                      {round.map((score, colIndex) => (
                        <td key={colIndex} className="p-1">
                          <button
                            onClick={() => !gameFinished && openNumpad(rowIndex, colIndex)}
                            disabled={gameFinished || inactivePlayers.includes(selectedPlayers[colIndex].id)}
                            className={`w-full h-12 rounded-xl font-display font-bold text-lg transition-all duration-200 bg-secondary text-foreground hover:bg-secondary/80 ${gameFinished || inactivePlayers.includes(selectedPlayers[colIndex].id) ? 'cursor-default opacity-50' : ''} ${currentCell?.col === colIndex && currentCell?.row === rowIndex ? 'ring-2 ring-primary/50 scale-105' : 'scale-100'}`}
                            data-row={rowIndex}
                            data-col={colIndex}
                            data-type="score"
                          >
                            {currentCell?.row === rowIndex && currentCell?.col === colIndex
                              ? (numpadValue === '' ? score : numpadValue)
                              : score}
                          </button>
                        </td>
                      ))}
                    </tr>
                  )
                ))}
                {/* Add Round Placeholder Row */}
                {!gameFinished && (
                  <tr className="opacity-60">
                    <td className="p-2 text-sm text-muted-foreground text-center sticky left-0 z-30 bg-background border-r-2 border-border shadow-lg">
                      <button
                        onClick={() => {
                          setScores(prev => [...prev, Array(selectedPlayers.length).fill(0)]);
                          if (gameType === 'judgement') {
                            setPredictions(prev => [...prev, Array(selectedPlayers.length).fill(null)]);
                            setResults(prev => [...prev, Array(selectedPlayers.length).fill(null)]);
                          }
                        }}
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
                  <td className="p-2 text-sm font-bold text-foreground text-center sticky left-0 z-50 bg-background border-r-2 border-border shadow-lg">Total</td>
                  {totals.map((total, i) => (
                    <td
                      key={i}
                      className={`p-2 text-center font-display text-xl font-bold ${total === extremeTotal ? 'text-red-600' : 'text-foreground'}`}
                    >
                    {total}
                  </td>
                ))}
                <td className="p-2 text-center sticky right-0 z-50 bg-background shadow-lg border-l-2 border-border font-bold text-foreground">
                  {totals.reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
          {/* Temporary Spacer for Numpad */}
          {currentCell && (
            <div className="w-full h-[50vh] transition-all duration-200" />
          )}
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

        {/* Temporary Spacer for Numpad */}
        {/* Removed from here, moved inside table container */}

      </main>

      <div className="p-6 pt-0 pb-4 bg-gradient-to-t from-background to-transparent">
        {gameFinished && (
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
          matchName={matchName}
          gameType={gameType}
          predictionValue={predictions[currentCell.row]?.[currentCell.col]}
          onMarkResult={handleMarkResult}
          scoringSystem={scoringSystem}
          penaltyMode={penaltyMode}
          customPoints={customPoints as number[]}
          calcPoints={calcPoints}
          type={currentCell.type}
        />
      )}
    </div>
  );
}
