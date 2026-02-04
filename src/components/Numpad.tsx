 

import { useRef, useEffect } from 'react';

interface NumpadProps {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onClose: () => void;
  onMove?: (dir: 'up' | 'down' | 'left' | 'right') => void;
  rowIndex?: number;
  colIndex?: number;
  playerName?: string;
  onPanX?: (dx: number) => void;
  keyboardType?: 'custom' | 'system';
}

export function Numpad({ value, onChange, onEnter, onClose, onMove, rowIndex, colIndex, playerName, onPanX, keyboardType = 'custom' }: NumpadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleButton = (btn: string) => {
    if (btn === 'C') {
      onChange('');
    } else if (btn === '←') {
      onChange(value.slice(0, -1));
    } else if (btn === '+/-') {
      if (value.startsWith('-')) {
        onChange(value.slice(1));
      } else if (value && value !== '0') {
        onChange('-' + value);
      }
    } else if (btn === 'Enter') {
      onEnter();
    } else {
      // Number buttons
      if (value === '0' && btn !== '.') {
        onChange(btn);
      } else {
        onChange(value + btn);
      }
    }
  };

  const handleQuickPoint = (points: number) => {
    const current = parseInt(value || '0', 10);
    let newValue: string;
    if (isNaN(current)) {
      newValue = points.toString();
    } else {
      newValue = (current + points).toString();
    }
    onChange(newValue);
    
    // Refocus input in system mode to keep keyboard open
    if (keyboardType === 'system') {
      // Small timeout to ensure state update doesn't interfere with focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const buttons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['+/-', '0', '←'],
  ];

  const quickPoints = [
    [1, 5, 10],
    [-1, -5, -10]
  ];

  let startX: number | null = null;
  let startY: number | null = null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-transparent animate-fade-in"
      onClick={onClose}
      onWheel={(e) => {
        onPanX?.(e.deltaX);
        if (Math.abs(e.deltaY) > 8) {
          if (e.deltaY > 0) onMove?.('down');
          else onMove?.('up');
        }
      }}
      onTouchStart={(e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        if (startX !== null) {
          const currentX = e.touches[0].clientX;
          const dx = startX - currentX;
          onPanX?.(dx);
          startX = currentX;
        }
        if (startY !== null) {
          const currentY = e.touches[0].clientY;
          const dy = startY - currentY;
          if (Math.abs(dy) > 12) {
            if (dy > 0) onMove?.('up');
            else onMove?.('down');
            startY = currentY;
          }
        }
      }}
    >
      <div 
        id="numpad-panel" 
        className={`w-full max-w-sm sm:max-w-md md:max-w-lg p-4 sm:p-5 animate-slide-up transition-all ${
          keyboardType === 'custom' 
            ? 'bg-card border border-border shadow-md rounded-t-3xl sm:pb-10' 
            : 'bg-transparent pb-0'
        }`} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Quick Points */}
        <div className={`space-y-2 ${keyboardType === 'system' ? 'bg-card/90 backdrop-blur-sm p-3 rounded-2xl border border-border/50 shadow-lg mb-2' : 'mb-4'}`}>
          {quickPoints.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 sm:gap-3">
              {row.map((points) => (
                <button
                  key={points}
                  onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                  onClick={() => handleQuickPoint(points)}
                  className={`h-10 sm:h-12 rounded-xl font-semibold text-sm sm:text-base transition-colors ${
                    points > 0 
                      ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                      : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  }`}
                >
                  {points > 0 ? '+' : ''}{points}
                </button>
              ))}
            </div>
          ))}
        </div>

        {keyboardType === 'custom' ? (
          <>
            {/* Numpad Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
              {buttons.flat().map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleButton(btn)}
                  className="numpad-btn h-12 sm:h-14 md:h-16 text-lg sm:text-xl font-semibold"
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => handleButton('C')}
                className="numpad-btn h-12 sm:h-14 md:h-16 bg-destructive/15 text-destructive hover:bg-destructive/25"
              >
                Clear
              </button>
              <button
                onClick={() => handleButton('Enter')}
                className="numpad-btn h-12 sm:h-14 md:h-16 bg-gradient-primary text-primary-foreground font-bold"
              >
                Enter
              </button>
            </div>
          </>
        ) : (
          /* System Keyboard Mode - Hidden Input */
          <div className="h-0 overflow-hidden opacity-0">
            <input
              ref={inputRef}
              type="tel"
              pattern="[0-9]*"
              inputMode="numeric"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEnter();
              }}
              autoFocus
              className="absolute bottom-0 left-0 w-1 h-1 opacity-0"
              placeholder="0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
