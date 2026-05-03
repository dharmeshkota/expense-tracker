import { Home, PieChart, Receipt, Settings, LogOut, Wallet, LayoutDashboard, BarChart3, Tag, Users, MoreHorizontal, Lock as VaultLock, Unlock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
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
  const { vaultKey, setVaultKey, setIsVaultGuardOpen, settings } = useStore();
  
  const handleLockVault = () => {
    setVaultKey(null);
    toast.success('Vault locked and key cleared from memory');
  };

  const isVaultEnabled = settings.useVault;

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
        <DropdownMenuContent align="end" side="top" className="w-48 p-2 rounded-2xl mb-2 ml-2 shadow-xl border-muted bg-card/95 backdrop-blur-md overflow-hidden space-y-1">
          {isVaultEnabled && (
            <DropdownMenuItem className="p-0">
              <button 
                onClick={vaultKey ? handleLockVault : () => setIsVaultGuardOpen(true)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full font-bold text-xs uppercase tracking-widest",
                  vaultKey ? "text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10" : "text-amber-500 bg-amber-500/5 hover:bg-amber-500/10"
                )}
              >
                {vaultKey ? <VaultLock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                <span>{vaultKey ? "Vault Active" : "Open Vault"}</span>
              </button>
            </DropdownMenuItem>
          )}
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
  const { user, vaultKey, setVaultKey, setIsVaultGuardOpen, settings } = useStore();

  const handleLockVault = () => {
    setVaultKey(null);
    toast.success('Vault locked and key cleared from memory');
  };

  const isVaultEnabled = settings.useVault;

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen fixed left-0 top-0 z-40">
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
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 transition-all hover:bg-muted group">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm transition-transform group-hover:scale-105">
              <AvatarImage src={user.image} />
              <AvatarFallback className="text-sm font-black bg-primary/10 text-primary">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate font-medium opacity-70">{user.email}</p>
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

      <div className="p-4 border-t space-y-2">
        {isVaultEnabled && (
          <button 
            onClick={vaultKey ? handleLockVault : () => setIsVaultGuardOpen(true)}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 w-full rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.2em] group shadow-sm",
              vaultKey 
                ? "text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10" 
                : "text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10"
            )}
          >
            <div className={cn(
              "h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
              vaultKey ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
            )}>
              {vaultKey ? <VaultLock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </div>
            <span className="flex-1 text-left">{vaultKey ? "Vault Active" : "Open Vault"}</span>
            {vaultKey && (
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            )}
          </button>
        )}
        <button 
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            localStorage.removeItem('expense-flow-storage');
            window.location.href = '/login';
          }}
          className="flex items-center space-x-3 px-3 py-2.5 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
