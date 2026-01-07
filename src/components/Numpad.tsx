 

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
}

export function Numpad({ value, onChange, onEnter, onClose, onMove, rowIndex, colIndex, playerName, onPanX }: NumpadProps) {
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

  const buttons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['+/-', '0', '←'],
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
      <div id="numpad-panel" className="w-full max-w-sm sm:max-w-md md:max-w-lg rounded-t-3xl p-4 sm:p-5 pb-8 sm:pb-10 safe-bottom animate-slide-up bg-card border border-border shadow-md" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
}
