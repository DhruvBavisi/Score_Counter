import { LucideIcon } from 'lucide-react';

interface MenuCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'primary' | 'accent' | 'success' | 'secondary';
  onClick: () => void;
  delay?: number;
}

const colorClasses = {
  primary: 'from-violet-500/25 via-fuchsia-400/15 to-violet-400/10 border-violet-400/35',
  accent: 'from-amber-400/25 via-amber-300/15 to-amber-200/10 border-amber-300/40',
  success: 'from-emerald-500/25 via-teal-400/15 to-emerald-400/10 border-emerald-400/35',
  secondary: 'from-zinc-200/50 via-zinc-100/40 to-white/30 border-zinc-300/60',
};

const iconColorClasses = {
  primary: 'text-violet-500',
  accent: 'text-amber-500',
  success: 'text-emerald-500',
  secondary: 'text-zinc-500',
};

export function MenuCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
  delay = 0,
}: MenuCardProps) {
  return (
    <button
      onClick={onClick}
      className={`menu-card w-full p-6 text-left bg-gradient-to-br ${colorClasses[color]} border shadow-md hover:shadow-lg transition-shadow`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4 shadow-sm`}>
        <Icon className={`w-7 h-7 ${iconColorClasses[color]}`} />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
