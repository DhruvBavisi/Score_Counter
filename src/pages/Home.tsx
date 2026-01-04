import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, Clock, Settings } from 'lucide-react';
import { MenuCard } from '@/components/MenuCard';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gradient-primary">
            GameTracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Score like a pro</p>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="px-6 pb-8">
        {/* Hero Section */}
        <div className="mb-8 text-center py-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow float-animation">
            <Gamepad2 className="w-12 h-12 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            Game Hub
          </h2>
          <p className="text-muted-foreground">
            Track scores, crown winners
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 gap-4 stagger-children">
          <MenuCard
            icon={Gamepad2}
            title="New Match"
            description="Start tracking"
            color="primary"
            onClick={() => navigate('/new-match')}
            delay={0}
          />
          <MenuCard
            icon={Users}
            title="Players"
            description="Manage vault"
            color="accent"
            onClick={() => navigate('/players')}
            delay={75}
          />
          <MenuCard
            icon={Clock}
            title="History"
            description="Past matches"
            color="success"
            onClick={() => navigate('/history')}
            delay={150}
          />
          <MenuCard
            icon={Settings}
            title="Settings"
            description="Preferences"
            color="secondary"
            onClick={() => navigate('/settings')}
            delay={225}
          />
        </div>
      </main>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-40 -right-20 w-60 h-60 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-success/5 blur-3xl" />
      </div>
    </div>
  );
}
