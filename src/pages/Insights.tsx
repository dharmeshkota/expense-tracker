import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Filter, TrendingUp, TrendingDown, Wallet, CreditCard, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn, formatCurrency } from '@/lib/utils';

export default function Insights() {
  const { expenses, settings, categories } = useStore();
  
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

  const filteredExpenses = useMemo(() => {
    const [year, month] = timeframe.split('-').map(Number);
    const targetDate = new Date(year, month - 1, 1);
    
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);

    return expenses.filter(e => isWithinInterval(new Date(e.date), { start, end }));
  }, [expenses, timeframe]);

  const totalSpent = useMemo(() => 
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
  [filteredExpenses]);

  const remainingBalance = settings.monthlySalary - totalSpent;
  const budgetUtilization = (totalSpent / settings.monthlyBudget) * 100;

  const categoryBreakdown = useMemo(() => {
    const breakdown = categories.map(cat => {
      const amount = filteredExpenses
        .filter(e => e.category === cat.name)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: cat.name,
        value: amount,
        color: cat.color
      };
    });

    // Catch expenses with categories not in the current list
    const knownCategoryNames = categories.map(c => c.name);
    const otherAmount = filteredExpenses
      .filter(e => !knownCategoryNames.includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    if (otherAmount > 0) {
      breakdown.push({
        name: 'Other',
        value: otherAmount,
        color: '#64748b'
      });
    }

    return breakdown.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categories]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const [year, month] = timeframe.split('-').map(Number);
    const targetDate = new Date(year, month - 1, 1);
    const monthName = format(targetDate, 'MMMM yyyy');

    // Header
    doc.setFontSize(24);
    doc.setTextColor(0, 122, 255);
    doc.text('ExpensePro Financial Report', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated on: ${format(now, 'PPP p')}`, 20, 35);
    doc.text(`Reporting Period: ${monthName}`, 20, 40);

    // Summary Table
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Monthly Summary', 20, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Monthly Income', formatCurrency(settings.monthlySalary, settings.currency)],
        ['Monthly Budget', formatCurrency(settings.monthlyBudget, settings.currency)],
        ['Total Expenses', formatCurrency(totalSpent, settings.currency)],
        ['Remaining Balance', formatCurrency(settings.monthlySalary - totalSpent, settings.currency)],
        ['Budget Utilization', `${((totalSpent / settings.monthlyBudget) * 100).toFixed(1)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 122, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Category Table
    doc.text('Spending by Category', 20, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Category', 'Amount', '% of Total']],
      body: categoryBreakdown.map(c => [
        c.name,
        formatCurrency(c.value, settings.currency),
        `${((c.value / totalSpent) * 100).toFixed(1)}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] }
    });

    // Transactions Table
    doc.text('Detailed Transactions', 20, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => [
        format(new Date(e.date), 'MMM dd, yyyy'),
        e.category,
        e.description,
        formatCurrency(e.amount, settings.currency)
      ]),
      theme: 'plain',
      styles: { fontSize: 9 }
    });

    doc.save(`ExpensePro_Report_${monthName.replace(' ', '_')}.pdf`);
    toast.success('Financial report downloaded!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-6 md:p-8 border border-primary/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Analytics</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Financial Insights</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md">
              Deep dive into your spending habits and patterns to optimize your financial health.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px] md:w-[200px] rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm h-11 text-xs font-bold hover:bg-background transition-all">
                <Calendar className="h-3.5 w-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={generatePDF} 
              className="rounded-xl h-11 px-6 gap-2 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </Button>
          </div>
        </header>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard 
          title="Total Spent"
          value={formatCurrency(totalSpent, settings.currency)}
          icon={Wallet}
          variant="primary"
        />
        <StatCard 
          title="Remaining Balance"
          value={formatCurrency(remainingBalance, settings.currency)}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard 
          title="Budget Utilization"
          value={`${budgetUtilization.toFixed(1)}%`}
          icon={BarChart3}
          variant="warning"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Category Breakdown
            </CardTitle>
            <CardDescription>Where your money is going this month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={80} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-foreground)' }}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                  formatter={(value: number) => formatCurrency(value, settings.currency)}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    borderColor: 'var(--color-border)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Top Spending Categories
            </CardTitle>
            <CardDescription>Your highest expense areas for this period.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-6">
              {categoryBreakdown.slice(0, 5).map((cat, index) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: cat.color }}>
                        {index + 1}
                      </div>
                      <span className="font-bold">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{formatCurrency(cat.value, settings.currency)}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        {((cat.value / totalSpent) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${(cat.value / totalSpent) * 100}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              ))}
              {categoryBreakdown.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No data available for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
