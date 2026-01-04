interface PlayerAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isWinner?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
};

const colors = [
  'from-sky-500 to-sky-400',
  'from-emerald-500 to-emerald-400',
  'from-amber-500 to-amber-400',
  'from-cyan-500 to-cyan-400',
  'from-lime-500 to-lime-400',
  'from-blue-500 to-blue-400',
  'from-orange-500 to-orange-400',
  'from-teal-500 to-teal-400',
];

export function PlayerAvatar({ name, size = 'md', isWinner = false }: PlayerAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate consistent color based on name
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-display font-bold text-primary-foreground shadow-md ${isWinner ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background shadow-[0_0_0_2px_hsl(45,100%,55%/0.25)_inset]' : ''}`}
    >
      {initials}
    </div>
  );
}
