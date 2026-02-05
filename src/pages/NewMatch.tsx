import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, Trophy, TrendingDown, Check, Plus, Crown, Medal, Play, ChevronDown, Settings, RotateCcw, LogOut, Edit, Save } from 'lucide-react';
import { useGame, Player } from '@/contexts/GameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Numpad } from '@/components/Numpad';
import { Confetti } from '@/components/Confetti';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
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

export default function NewMatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { players: allPlayers, addPlayer, addGame } = useGame();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastRowRef = useRef<HTMLTableRowElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGroups, setShowGroups] = useState(false);


  // PlayerList component definition moved to top
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
                "h-[85vh] p-0 rounded-t-3xl outline-none transition-transform duration-300 ease-in-out",
                isClosing ? "translate-y-full" : "translate-y-0"
              )} 
              hideClose
            >
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
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            onPointerDown={(e) => handlePointerDown(e, id, index)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onClick={(e) => {
                              // Only deselect if not dragging
                              if (!draggingState) {
                                setTempSelected(prev => prev.filter(pid => pid !== id));
                              }
                            }}
                            style={getItemStyle(index, id)}
                            className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 border-primary bg-primary/10 select-none cursor-pointer`}
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
                          transition={{ duration: 0.4, ease: "easeInOut" }}
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
                <div className="p-6 bg-gradient-to-t from-background to-transparent safe-bottom">
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

  // Setup state
  const [winnerRule, setWinnerRule] = useState<'highest' | 'lowest'>('highest');
  const [numRounds, setNumRounds] = useState(5);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [savedScores, setSavedScores] = useState<number[][]>([]);
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGroup, setNewPlayerGroup] = useState('');
  const [matchName, setMatchName] = useState('');
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

  // Scoreboard state
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState<number[][]>([]);
  const [currentCell, setCurrentCell] = useState<{ row: number; col: number } | null>(null);
  const [numpadValue, setNumpadValue] = useState('');
  const [gameFinished, setGameFinished] = useState(false);
  const [inactivePlayers, setInactivePlayers] = useState<string[]>([]);
  const [menuTarget, setMenuTarget] = useState<string | null>(null);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const toggleInactive = (id: string) =>
    setInactivePlayers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
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
    setInactivePlayers((prev) => prev.filter((id) => id !== playerId));
    setCurrentCell((prev) => {
      if (!prev) return prev;
      if (prev.col === index) return null;
      if (prev.col > index) return { row: prev.row, col: prev.col - 1 };
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
      // Map previous scores to players by ID
      const playerScoresMap = new Map<string, number[]>();
      // savedPlayers should match the columns of savedScores
      // If savedPlayers is empty (legacy/edge case), we fallback to index mapping (risky but better than crash)
      const sourcePlayers = savedPlayers.length > 0 ? savedPlayers : selectedPlayers; 
      
      sourcePlayers.forEach((player, index) => {
        const scoresForPlayer = savedScores.map(round => round[index]);
        playerScoresMap.set(player.id, scoresForPlayer);
      });

      // Reconstruct scores for the current selectedPlayers order
      // We take the max rounds from savedScores to preserve history
      const roundsCount = savedScores.length;
      
      const newScores: number[][] = [];
      for (let r = 0; r < roundsCount; r++) {
        const newRound: number[] = [];
        selectedPlayers.forEach(player => {
          const pScores = playerScoresMap.get(player.id);
          // If player existed and has a score for this round, use it. Otherwise 0.
          if (pScores && pScores[r] !== undefined) {
            newRound.push(pScores[r]);
          } else {
            newRound.push(0);
          }
        });
        newScores.push(newRound);
      }
      
      // If rounds increased via settings
      if (numRounds > newScores.length) {
        const extraRounds = Array(numRounds - newScores.length).fill(null).map(() => Array(selectedPlayers.length).fill(0));
        setScores([...newScores, ...extraRounds]);
      } else {
        // If rounds decreased, we slice.
        setScores(newScores.slice(0, numRounds));
      }
      setIsEditing(false);
    } else {
      // New game
      setScores(Array(numRounds).fill(null).map(() => Array(selectedPlayers.length).fill(0)));
    }
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
    const cell = document.querySelector(
      `button[data-row="${row}"][data-col="${col}"]`
    ) as HTMLButtonElement | null;

    if (!container || !cell) return;

    const containerRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const stickyColumnWidth = 64; // matches your "Round" column width
    const padding = 24;

    // Horizontal scroll — respect sticky column
    if (cellRect.right > containerRect.right - padding) {
      container.scrollLeft += cellRect.right - (containerRect.right - padding);
    } else if (cellRect.left < containerRect.left + stickyColumnWidth + padding) {
      container.scrollLeft -=
        containerRect.left + stickyColumnWidth + padding - cellRect.left;
    }

    // Vertical scroll
    const panel = document.getElementById('numpad-panel');
    const panelHeight = panel ? panel.offsetHeight : 350; // Estimate
    
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportOffsetTop = window.visualViewport?.offsetTop || 0;
    
    // Visible area bottom (in viewport coordinates)
    // Leave space above numpad
    const safeBottom = viewportHeight + viewportOffsetTop - panelHeight - 40;
    
    // Sticky header height inside container
    const stickyHeaderHeight = 40;

    // If cell is below safe zone (covered by numpad)
    if (cellRect.bottom > safeBottom) {
       const diff = cellRect.bottom - safeBottom;
       container.scrollTop += diff;
    } 
    // If cell is above safe zone (covered by header)
    else if (cellRect.top < containerRect.top + stickyHeaderHeight) {
       const diff = (containerRect.top + stickyHeaderHeight) - cellRect.top;
       container.scrollTop -= diff;
    }
  };

  // Auto-scroll when cell is selected (and Numpad appears)
  useEffect(() => {
    if (currentCell) {
      // Small delay to allow Numpad to mount/render
      const timer = setTimeout(() => {
        scrollActiveCellIntoView(currentCell.row, currentCell.col);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentCell]);

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
    const isActive = (idx: number) => {
      const id = selectedPlayers[idx]?.id;
      return id ? !inactivePlayers.includes(id) : false;
    };
    for (let c = col + 1; c < numPlayers; c++) {
      if (isActive(c)) {
        setCurrentCell({ row, col: c });
        setNumpadValue(newScores[row][c].toString());
        scrollActiveCellIntoView(row, c);
        return;
      }
    }
    for (let r = row + 1; r < newScores.length; r++) {
      for (let c = 0; c < numPlayers; c++) {
        if (isActive(c)) {
          setCurrentCell({ row: r, col: c });
          setNumpadValue(newScores[r][c].toString());
          scrollActiveCellIntoView(r, c);
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
  <div className="space-y-4 mb-4">

    {/* Player Name + Add Button */}
    <div className="flex gap-3 items-end">

  <div className="flex-1 relative group">
    <input
      type="text"
      value={newPlayerName}
      onChange={(e) => setNewPlayerName(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleAddNewPlayer()}
      placeholder="Enter player name"
      className="
        w-full px-5 py-3 rounded-2xl
        bg-secondary text-foreground
        placeholder:text-muted-foreground
        border border-border
        focus:border-primary focus:ring-2 focus:ring-primary/30
        outline-none transition-all
        font-display text-sm shadow-sm
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

    <div className="relative group">
      <input
        type="text"
        value={newPlayerGroup}
        onChange={(e) => setNewPlayerGroup(e.target.value)}
        onFocus={() => setShowGroups(true)}
        onBlur={() => setShowGroups(false)}
        placeholder="Select or create a group"
        className="
          w-full px-5 py-3 pr-12 rounded-2xl mb-3
          bg-secondary text-foreground 
          placeholder:text-muted-foreground 
          border border-border 
          focus:border-primary focus:ring-2 focus:ring-primary/30 
          outline-none transition-all 
          font-display text-sm shadow-sm
          appearance-none 
          [&::-webkit-calendar-picker-indicator]:hidden
          [&::-webkit-list-button]:hidden
        "
      />

      <ChevronDown className="absolute right-4 top-1/2 -translate-y-[70%] w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />

      {/* <span className="absolute left-4 -top-2 text-xs bg-background px-2 text-muted-foreground font-semibold">
        Group
      </span> */}
    </div>

    {showGroups && uniqueGroups.length > 0 && (
      <div className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-background shadow-xl overflow-hidden animate-fade-in">
        <div className="max-h-56 overflow-y-auto">
          {uniqueGroups
            .filter(group => group.toLowerCase().includes(newPlayerGroup.toLowerCase()))
            .map(group => (
              <button
              key={group}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();       // prevents input blur
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

            ))}
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
      <header className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (gameFinished) {
                navigate('/');
              } else {
                setIsEditing(true);
                setSavedScores(scores);
                setSavedPlayers(selectedPlayers);
                setGameStarted(false);
              }
            }}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            {/* <ArrowLeft className="w-6 h-6 text-foreground" /> */}
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">
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
                  <Settings className="w-6 h-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-border/50 bg-background/95 backdrop-blur-sm">
              <DropdownMenuItem
                onClick={() => {
                  setIsEditing(true);
                  setSavedScores(scores);
                  setSavedPlayers(selectedPlayers);
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
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg border-2 border-border/50 shadow-2xl animate-in fade-in zoom-in duration-300">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-500 mb-2">
              <RotateCcw className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-display font-bold text-center">Restart Game?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              This will reset all current scores to zero. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-2 font-bold hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setScores(Array(numRounds).fill(null).map(() => Array(selectedPlayers.length).fill(0)));
                setGameFinished(false);
                toast.success('Game restarted');
              }}
              className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold border-none shadow-lg shadow-orange-500/20"
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Game Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg border-2 border-border/50 shadow-2xl animate-in fade-in zoom-in duration-300">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center text-red-500 mb-2">
              <LogOut className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-display font-bold text-center text-red-600">Exit Game?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base text-red-500/80">
              Your current game progress will be lost. Are you sure you want to go back to the home screen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-2 font-bold hover:bg-secondary">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('/')}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold border-none shadow-lg shadow-red-500/20"
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finish Game Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg border-2 border-border/50 shadow-2xl animate-in fade-in zoom-in duration-300">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-primary mb-2">
              <Trophy className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-display font-bold text-center">Finish Match?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              Are you ready to see the final results? This will crown the winner and finalize the scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-2 font-bold hover:bg-secondary">
              Keep Playing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={finishGame}
              className="flex-1 h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-bold border-none shadow-glow active:scale-[0.98] transition-all"
            >
              Finish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 p-6 page-enter space-y-6 pb-6">
        {/* Score Table */}
        <div className="overflow-auto -mx-6 px-0 pb-0 mobile-hide-scrollbar relative max-h-[70vh] bg-background" ref={scrollRef}>
          <table className="w-full border-separate min-w-max no-border-spacing">
            <thead className="sticky top-0 z-50 bg-background shadow-none">
              <tr>
                <th className="p-2 text-center text-xs text-muted-foreground font-normal sticky left-0 top-0 z-[60] bg-background border-b border-border border-r">Round</th>
                {selectedPlayers.map((player, i) => (
                  <th
                    key={player.id}
                    className={`p-2 text-center min-w-[80px] sticky top-0 z-50 bg-background border-b border-border ${currentCell?.col === i ? 'text-primary' : 'text-foreground'}`}
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
          {/* Temporary Spacer for Numpad */}
          {currentCell && (
            <div className="w-full h-[50vh] transition-all duration-300" />
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
        />
      )}
    </div>
  );
}


