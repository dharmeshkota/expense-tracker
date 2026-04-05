import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, icon: Icon, trend, className, iconClassName, variant = 'default' }: StatCardProps) {
  const variants = {
    default: "bg-card border-none shadow-sm",
    primary: "bg-primary/5 border-none shadow-sm",
    success: "bg-emerald-500/5 border-none shadow-sm",
    warning: "bg-amber-500/5 border-none shadow-sm",
    danger: "bg-destructive/5 border-none shadow-sm",
  };

  const iconVariants = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <div className={cn("p-6 rounded-3xl transition-all duration-300 hover:scale-[1.02]", variants[variant], className)}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl", iconVariants[variant], iconClassName)}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
            trend.isPositive 
              ? "bg-emerald-500/10 text-emerald-600" 
              : "bg-destructive/10 text-destructive"
          )}>
            <span className="uppercase tracking-wider">{trend.value}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black tracking-tight">{value}</h3>
      </div>
    </div>
  );
}
