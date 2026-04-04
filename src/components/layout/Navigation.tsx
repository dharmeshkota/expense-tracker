import { Home, PlusCircle, PieChart, Bell, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: PieChart, label: 'Insights', href: '/insights' },
  { icon: Bell, label: 'Bills', href: '/bills' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t h-16 flex items-center justify-around px-4 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">ExpensePro</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <button 
          onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload())}
          className="flex items-center space-x-3 px-3 py-2 w-full text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
