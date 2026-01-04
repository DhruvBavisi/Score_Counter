import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { clearAllData, players, games } = useGame();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearData = () => {
    clearAllData();
    setShowConfirm(false);
    toast.success('All data cleared!');
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
          <h1 className="font-display text-lg font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Preferences & data</p>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 page-enter">
        <div className="space-y-6">
          {/* Theme Toggle */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  {theme === 'dark' ? (
                    <Moon className="w-6 h-6 text-primary" />
                  ) : (
                    <Sun className="w-6 h-6 text-accent" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Theme</h3>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`theme-toggle ${theme === 'dark' ? 'dark' : ''}`}
              >
                <div className="theme-toggle-knob flex items-center justify-center">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-primary" />
                  ) : (
                    <Sun className="w-4 h-4 text-accent" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Data Stats */}
          <div className="glass-card p-4">
            <h3 className="font-semibold text-foreground mb-4">Data Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-secondary">
                <p className="text-3xl font-display font-bold text-primary">{players.length}</p>
                <p className="text-sm text-muted-foreground">Players</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary">
                <p className="text-3xl font-display font-bold text-accent">{games.length}</p>
                <p className="text-sm text-muted-foreground">Games</p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-4 border-destructive/30">
            <h3 className="font-semibold text-destructive mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h3>
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center gap-2 hover:bg-destructive/30 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Clear All Data
            </button>
          </div>

          {/* Version */}
          <div className="text-center text-sm text-muted-foreground pt-8">
            <p>GameTracker v1.0</p>
            <p>Made with ❤️</p>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 max-w-sm w-full animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground text-center mb-2">
              Clear All Data?
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              This will permanently delete all players and game history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
