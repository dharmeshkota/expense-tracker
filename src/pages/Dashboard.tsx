import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/dashboard/StatCard';
import { Wallet, TrendingUp, Calendar, CreditCard, Plus, ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuickAddExpense } from '@/components/dashboard/QuickAddExpense';

export default function Dashboard() {
  const { expenses, settings, categories, setExpenses, setBills } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesRes, billsRes] = await Promise.all([
          fetch('/api/expenses'),
          fetch('/api/bills')
        ]);
        if (expensesRes.ok) setExpenses(await expensesRes.json());
        if (billsRes.ok) setBills(await billsRes.json());
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, [setExpenses, setBills]);

  const currentMonthExpenses = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return expenses.filter(e => isWithinInterval(new Date(e.date), { start, end }));
  }, [expenses]);

  const totalSpent = useMemo(() => 
    currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0),
  [currentMonthExpenses]);

  const remainingBudget = Math.max(0, settings.monthlyBudget - totalSpent);
  const budgetProgress = Math.min(100, (totalSpent / settings.monthlyBudget) * 100);

  const dailyAverage = currentMonthExpenses.length > 0 
    ? totalSpent / new Date().getDate() 
    : 0;

  const chartData = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = new Date();
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const amount = expenses
        .filter(e => format(new Date(e.date), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        date: format(day, 'MMM dd'),
        amount
      };
    });
  }, [expenses]);

  const categoryData = useMemo(() => {
    return categories.map(cat => {
      const amount = currentMonthExpenses
        .filter(e => e.category === cat.name)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: cat.name,
        value: amount,
        color: cat.color
      };
    }).filter(d => d.value > 0);
  }, [currentMonthExpenses, categories]);

  const recentExpenses = useMemo(() => 
    expenses.slice(0, 5),
  [expenses]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your money.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3 bg-card border rounded-xl px-4 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{format(new Date(), 'MMMM yyyy')}</span>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="rounded-xl h-10 px-4 gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Spent"
          value={`$${totalSpent.toLocaleString()}`}
          icon={Wallet}
          variant="danger"
          trend={{ value: '+12.5%', isPositive: false }}
        />
        <StatCard 
          title="Remaining"
          value={`$${remainingBudget.toLocaleString()}`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard 
          title="Daily Average"
          value={`$${dailyAverage.toFixed(2)}`}
          icon={Calendar}
          variant="primary"
        />
        <StatCard 
          title="Monthly Budget"
          value={`$${settings.monthlyBudget.toLocaleString()}`}
          icon={CreditCard}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Spending Trend</h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span>Daily Expenses</span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-card)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Monthly Budget</h3>
              <span className="text-sm font-medium text-muted-foreground">
                {budgetProgress.toFixed(0)}% Used
              </span>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-out rounded-full",
                    budgetProgress > 90 ? "bg-destructive" : budgetProgress > 70 ? "bg-orange-500" : "bg-primary"
                  )}
                  style={{ width: `${budgetProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">${totalSpent.toLocaleString()} spent</span>
                <span className="text-muted-foreground">Budget: ${settings.monthlyBudget.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6">By Category</h3>
            <div className="h-[250px] w-full">
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
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-card)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {categoryData.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <span className="text-sm font-bold">${cat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Recent Transactions</h3>
              <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/10">View All</Button>
            </div>
            <div className="space-y-4">
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense) => {
                  const category = categories.find(c => c.name === expense.category);
                  return (
                    <div key={expense.id} className="flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: category?.color || '#64748b' }}
                        >
                          <span className="text-xs font-bold">{expense.category.charAt(0)}</span>
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
                      <span className="text-sm font-bold text-destructive">
                        -${expense.amount.toLocaleString()}
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
        onSuccess={() => {}} 
      />
    </div>
  );
}
