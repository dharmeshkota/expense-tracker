import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, TrendingDown, CreditCard, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { QuickAddExpense } from '@/components/dashboard/QuickAddExpense';
import { motion } from 'framer-motion';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchStats = async () => {
    const now = new Date();
    const res = await fetch(`/api/stats?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats) return null;

  const spentPercentage = (stats.totalSpent / stats.totalSalary) * 100 || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your monthly summary.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="rounded-full h-12 px-6 gap-2 shadow-lg">
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Add Expense</span>
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Remaining Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.remaining.toLocaleString()}</div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs opacity-80">
                <span>Spent: ${stats.totalSpent.toLocaleString()}</span>
                <span>{Math.round(spentPercentage)}%</span>
              </div>
              <Progress value={spentPercentage} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">This month so far</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Salary</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSalary.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly budget set</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryBreakdown}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.categoryBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No expenses recorded yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentExpenses.map((expense: any) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-muted text-[10px] font-bold uppercase tracking-wider">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{expense.description || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${expense.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.recentExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No recent transactions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <QuickAddExpense 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSuccess={fetchStats} 
      />
    </div>
  );
}
