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
  primary: 'from-primary/20 to-primary/5 border-primary/30',
  accent: 'from-accent/20 to-accent/5 border-accent/30',
  success: 'from-success/20 to-success/5 border-success/30',
  secondary: 'from-secondary to-secondary/50 border-border',
};

const iconColorClasses = {
  primary: 'text-primary',
  accent: 'text-accent',
  success: 'text-success',
  secondary: 'text-muted-foreground',
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
      className={`menu-card w-full p-6 text-left bg-gradient-to-br ${colorClasses[color]} border`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className={`w-7 h-7 ${iconColorClasses[color]}`} />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
