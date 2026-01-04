import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${isDark ? 'dark' : ''}`}
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-knob flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-primary" />
        ) : (
          <Sun className="w-4 h-4 text-accent" />
        )}
      </div>
    </button>
  );
}
