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
  'from-primary to-primary/70',
  'from-accent to-accent/70',
  'from-success to-success/70',
  'from-destructive to-destructive/70',
  'from-blue-500 to-blue-400',
  'from-purple-500 to-purple-400',
  'from-pink-500 to-pink-400',
  'from-orange-500 to-orange-400',
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
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-display font-bold text-primary-foreground shadow-md ${isWinner ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}`}
    >
      {initials}
    </div>
  );
}
