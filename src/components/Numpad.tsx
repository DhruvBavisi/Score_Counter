 

import { useRef, useEffect, useState } from 'react';

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
  matchName?: string;
}

export function Numpad({ value, onChange, onEnter, onClose, onMove, rowIndex, colIndex, playerName, onPanX, matchName }: NumpadProps) {
  const isBadamSatti = matchName?.toLowerCase().includes('badam satti');
  const [mode, setMode] = useState<'standard' | 'badam'>(isBadamSatti ? 'badam' : 'standard');

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
      if (mode === 'badam') {
        const current = parseInt(value || '0', 10);
        const add = parseInt(btn, 10);
        onChange((current + add).toString());
      } else {
        if (value === '0' && btn !== '.') {
          onChange(btn);
        } else {
          onChange(value + btn);
        }
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
  };

  const standardButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['+/-', '0', '←'],
  ];

  const badamButtons = [
    ['1', '2', '3', '4'],
    ['5', '6', '7', '8'],
    ['9', '10', '11', '12'],
    ['13'],
  ];

  const quickPoints = [
    [1, 5, 10],
    [-1, -5, -10]
  ];

  let startX: number | null = null;
  let startY: number | null = null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div 
        id="numpad-panel" 
        className="w-full max-w-sm sm:max-w-md md:max-w-lg p-4 sm:p-5 animate-slide-up transition-all bg-card border border-border shadow-md rounded-t-3xl sm:pb-10 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
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
        
        {/* Mode Toggle */}
        <div className="flex justify-center mb-4">
          <div className="bg-secondary/50 p-1 rounded-2xl flex gap-1 w-full max-w-[200px]">
            <button
              onClick={() => setMode('badam')}
              className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition-all ${
                mode === 'badam' 
                  ? 'bg-background text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Badam
            </button>
            <button
              onClick={() => setMode('standard')}
              className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition-all ${
                mode === 'standard' 
                  ? 'bg-background text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              123
            </button>
          </div>
        </div>

        {/* Quick Points */}
        {!isBadamSatti && (
          <div className="space-y-2 mb-4">
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
        )}

        {/* Numpad Grid */}
        {mode === 'standard' ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
            {standardButtons.flat().map((btn) => (
              <button
                key={btn}
                onClick={() => handleButton(btn)}
                className="numpad-btn h-12 sm:h-14 md:h-16 text-lg sm:text-xl font-semibold"
              >
                {btn}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
            {badamButtons.flat().map((btn) => (
              <button
                key={btn}
                onClick={() => handleButton(btn)}
                className={`numpad-btn h-12 sm:h-14 md:h-16 text-lg sm:text-xl font-semibold ${
                  btn === '13' ? 'col-span-4' : ''
                }`}
              >
                {btn}
              </button>
            ))}
          </div>
        )}

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
      </div>
    </div>
  );
}
