import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/dashboard/StatCard';
import { Wallet, TrendingUp, Calendar as CalendarIcon, CreditCard, Plus, Search, Filter, LayoutDashboard, TrendingDown, Loader2 } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuickAddExpense } from '@/components/dashboard/QuickAddExpense';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { decryptData, isEncrypted } from '@/lib/encryption';
import { VaultGuard } from '@/components/VaultGuard';

export default function Dashboard() {
  const { settings, categories, setCategories, setBills, vaultKey } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      result.push({
        label: format(date, 'MMMM yyyy'),
        value: format(date, 'yyyy-MM'),
      });
    }
    return result;
  }, []);

  const [timeframe, setTimeframe] = useState(months[0].value);

  // Use TanStack Query for data fetching
  const { data: dashboardData, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard', timeframe, vaultKey, settings.useVault],
    queryFn: async () => {
      const [year, month] = timeframe.split('-');
      const [statsRes, expensesRes, billsRes, categoriesRes] = await Promise.all([
        fetch(`/api/stats?month=${month}&year=${year}`),
        fetch(`/api/expenses?month=${month}&year=${year}&limit=1000`),
        fetch('/api/bills'),
        fetch('/api/categories')
      ]);
      
      if (!statsRes.ok || !expensesRes.ok || !billsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [serverStats, expensesData, bills, cats] = await Promise.all([
        statsRes.json(),
        expensesRes.json(),
        billsRes.json(),
        categoriesRes.json()
      ]);

      // Global sync
      setCategories(cats);
      setBills(bills);

      // Decrypt expenses if vault key is present
      const decryptedExpenses = expensesData.expenses.map((e: any) => {
        if (vaultKey && isEncrypted(e.description)) {
          const decrypted = decryptData(e.description, vaultKey as string);
          if (decrypted && typeof decrypted === 'object' && decrypted.isEncryptedViaVault) {
            return {
              ...e,
              amount: decrypted.amount,
              description: decrypted.description,
              isActuallyEncrypted: true
            };
          }
        }
        return e;
      });

      // If we have a vault key, we recalculate stats locally because server might have 0 amounts
      let finalStats = serverStats;
      if (vaultKey) {
        const excludedCategoryNames = cats
          .filter((c: any) => c.excludeFromBudget)
          .map((c: any) => c.name);

        const totalIncome = decryptedExpenses
          .filter((e: any) => e.type === 'income')
          .reduce((sum: number, e: any) => sum + e.amount, 0);

        const totalSpent = decryptedExpenses
          .filter((e: any) => e.type === 'expense')
          .reduce((sum: number, e: any) => sum + e.amount, 0);

        const budgetSpent = decryptedExpenses
          .filter((e: any) => e.type === 'expense' && !excludedCategoryNames.includes(e.category))
          .reduce((sum: number, e: any) => sum + e.amount, 0);

        const categoryBreakdown: Record<string, number> = decryptedExpenses
          .filter((e: any) => e.type === 'expense')
          .reduce((acc: any, e: any) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
          }, {});

        finalStats = {
          ...serverStats,
          totalIncome,
          totalSpent,
          budgetSpent,
          remaining: (serverStats.totalSalary || 0) + totalIncome - totalSpent,
          categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
          recentExpenses: [...decryptedExpenses].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
        };
      } else {
        // Just sort recent expenses if not in vault mode (legacy/mixed data)
        finalStats.recentExpenses = decryptedExpenses.slice(0, 5);
      }

      return {
        stats: finalStats,
        expenses: decryptedExpenses,
        bills
      };
    },
    staleTime: 30000,
  });

  const stats = dashboardData?.stats;
  const expenses = dashboardData?.expenses || [];

  const chartData = useMemo(() => {
    if (!dashboardData) return [];
    
    const [year, month] = timeframe.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = timeframe === months[0].value ? new Date() : endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const amount = expenses
        .filter(e => e.type !== 'income' && format(new Date(e.date), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, e) => sum + e.amount, 0);
      const income = expenses
        .filter(e => e.type === 'income' && format(new Date(e.date), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        date: format(day, 'MMM dd'),
        amount,
        income
      };
    });
  }, [dashboardData, timeframe, months, expenses]);

  const categoryData = useMemo(() => {
    if (!stats) return [];
    return stats.categoryBreakdown.map((item: any) => {
      const cat = categories.find(c => c.name === item.name);
      return {
        ...item,
        color: cat?.color || '#64748b'
      };
    }).sort((a: any, b: any) => b.value - a.value);
  }, [stats, categories]);

  const budgetProgress = stats ? Math.min(100, (stats.budgetSpent / settings.monthlyBudget) * 100) : 0;

  return (
    <VaultGuard>
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {isFetching && !isLoading && (
        <div className="absolute top-0 right-0 z-50 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary opacity-50" />
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-6 md:p-8 border border-primary/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Overview</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md">
              Welcome back! Here's a summary of your financial status.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-full sm:w-[180px] rounded-xl bg-background/50 backdrop-blur-sm border-none shadow-sm h-11 text-xs font-bold">
                <CalendarIcon className="h-3.5 w-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => setIsAddOpen(true)} 
              className="rounded-xl h-11 px-6 gap-2 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Transaction</span>
            </Button>
          </div>
        </header>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-muted animate-pulse" />
          ))
        ) : (
          <>
            <StatCard 
              title="Total Spent"
              value={formatCurrency(stats?.totalSpent || 0, settings.currency)}
              icon={TrendingDown}
              variant="danger"
            />
            <StatCard 
              title="Total Income"
              value={formatCurrency((stats?.totalSalary || 0) + (stats?.totalIncome || 0), settings.currency)}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard 
              title="Budget Remaining"
              value={formatCurrency(Math.max(0, settings.monthlyBudget - (stats?.budgetSpent || 0)), settings.currency)}
              icon={Wallet}
              variant="primary"
            />
            <StatCard 
              title="Monthly Budget"
              value={formatCurrency(settings.monthlyBudget, settings.currency)}
              icon={CreditCard}
              variant="warning"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Financial Trend</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span>Expenses</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="h-3 w-3 rounded-full bg-indigo-500" />
                  <span>Income</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {isLoading ? (
                <div className="h-full w-full bg-muted/50 animate-pulse rounded-xl flex items-center justify-center">
                  <LayoutDashboard className="h-8 w-8 text-muted animate-bounce" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                      dy={10}
                      minTickGap={30}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                      tickFormatter={(value) => formatCurrency(value, settings.currency)}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
                              <div className="space-y-2">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-sm font-bold">{entry.name}</span>
                                    </div>
                                    <span className="text-sm font-black" style={{ color: entry.color }}>
                                      {formatCurrency(entry.value, settings.currency)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      name="Expenses"
                      type="monotone" 
                      dataKey="amount" 
                      stroke="var(--color-primary)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                    <Area 
                      name="Income"
                      type="monotone" 
                      dataKey="income" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorIncome)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Budget Utilization</h3>
              <span className="text-sm font-medium text-muted-foreground">
                {isLoading ? "..." : budgetProgress.toFixed(0)}% Used
              </span>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                {isLoading ? (
                  <div className="h-full w-1/3 bg-primary/20 animate-pulse" />
                ) : (
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out rounded-full",
                      budgetProgress > 90 ? "bg-destructive" : budgetProgress > 70 ? "bg-orange-500" : "bg-primary"
                    )}
                    style={{ width: `${budgetProgress}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{isLoading ? "Loading..." : `${formatCurrency(stats?.budgetSpent || 0, settings.currency)} spent`}</span>
                <span className="text-muted-foreground">Budget: {formatCurrency(settings.monthlyBudget, settings.currency)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * Some categories are excluded from budget calculation as per your settings.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6">By Category</h3>
            <div className="h-[250px] w-full">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full border-8 border-muted border-t-primary animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value, settings.currency)}
                      contentStyle={{ 
                        backgroundColor: 'var(--color-card)', 
                        borderColor: 'var(--color-border)',
                        borderRadius: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-4 w-full bg-muted animate-pulse rounded" />
                ))
              ) : (
                categoryData.slice(0, 4).map((cat: any, i: number) => (
                  <div key={`${cat.name}-${i}`} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <span className="text-sm font-bold">{formatCurrency(cat.value, settings.currency)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Recent Transactions</h3>
              <Link to="/transactions">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/10">View All</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-2 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </div>
                ))
              ) : stats?.recentExpenses?.length > 0 ? (
                stats.recentExpenses.map((expense: any, i: number) => {
                  const category = categories.find(c => c.name === expense.category);
                  const isIncome = expense.type === 'income';
                  return (
                    <div key={`${expense.id}-${i}`} className="flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: category?.color || (isIncome ? '#6366f1' : '#64748b') }}
                        >
                          {isIncome ? <TrendingUp className="h-5 w-5" /> : <span className="text-xs font-bold">{expense.category.charAt(0)}</span>}
                        </div>
                        <div>
                          <p className="text-sm font-bold group-hover:text-primary transition-colors truncate max-w-[120px]">
                            {expense.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(expense.date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-sm font-bold", isIncome ? "text-indigo-500" : "text-destructive")}>
                        {isIncome ? '+' : '-'}{formatCurrency(expense.amount, settings.currency)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No recent transactions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <QuickAddExpense 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
      />
    </div>
    </VaultGuard>
  );
}
