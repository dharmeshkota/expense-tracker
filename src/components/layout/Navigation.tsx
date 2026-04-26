import { Home, PieChart, Receipt, Settings, LogOut, Wallet, LayoutDashboard, BarChart3, Tag, Users, MoreHorizontal } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Wallet, label: 'Expenses', href: '/transactions' },
  { icon: BarChart3, label: 'Insights', href: '/insights' },
  { icon: Users, label: 'Groups', href: '/groups' },
  { icon: Receipt, label: 'Bills', href: '/bills' },
  { icon: Tag, label: 'Categories', href: '/categories' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function BottomNav() {
  const location = useLocation();
  
  // Main items to show directly in the bar
  const mainItems = navItems.slice(0, 4);
  // Items to hide under the "More" menu
  const moreItems = navItems.slice(4);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t h-16 flex items-center justify-around px-2 z-50">
      {mainItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 space-y-1 transition-all rounded-xl",
              isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "fill-current/10")} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}
      
      <DropdownMenu>
        <DropdownMenuTrigger className="flex flex-col items-center justify-center flex-1 py-1 space-y-1 text-muted-foreground outline-none border-none bg-transparent cursor-pointer">
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-bold">More</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-48 p-2 rounded-2xl mb-2 ml-2 shadow-xl border-muted bg-card/95 backdrop-blur-md overflow-hidden">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <DropdownMenuItem key={item.href} className="p-0">
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full",
                    isActive ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

export function Sidebar() {
  const location = useLocation();
  const { user } = useStore();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
      <div className="p-6 flex items-center space-x-3">
        <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Wallet className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight text-foreground leading-none">ExpensePro</h1>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Smart Tracking</span>
        </div>
      </div>

      {user && (
        <div className="px-6 mb-6">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
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
          className="flex items-center space-x-3 px-3 py-2.5 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
