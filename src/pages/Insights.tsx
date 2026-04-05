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
import { cn } from '@/lib/utils';

export default function Insights() {
  const { expenses, settings, categories } = useStore();
  const [timeframe, setTimeframe] = useState('current');

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let start = startOfMonth(now);
    let end = endOfMonth(now);

    if (timeframe === 'last') {
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
    }

    return expenses.filter(e => isWithinInterval(new Date(e.date), { start, end }));
  }, [expenses, timeframe]);

  const totalSpent = useMemo(() => 
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
  [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    return categories.map(cat => {
      const amount = filteredExpenses
        .filter(e => e.category === cat.name)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: cat.name,
        value: amount,
        color: cat.color
      };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categories]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const monthName = timeframe === 'current' 
      ? format(now, 'MMMM yyyy')
      : format(subMonths(now, 1), 'MMMM yyyy');

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
        ['Monthly Income', `$${settings.monthlySalary.toLocaleString()}`],
        ['Monthly Budget', `$${settings.monthlyBudget.toLocaleString()}`],
        ['Total Expenses', `$${totalSpent.toLocaleString()}`],
        ['Remaining Balance', `$${(settings.monthlySalary - totalSpent).toLocaleString()}`],
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
        `$${c.value.toLocaleString()}`,
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
        `$${e.amount.toLocaleString()}`
      ]),
      theme: 'plain',
      styles: { fontSize: 9 }
    });

    doc.save(`ExpensePro_Report_${monthName.replace(' ', '_')}.pdf`);
    toast.success('Financial report downloaded!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your spending habits and patterns.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[160px] rounded-xl bg-card border-none shadow-sm h-10">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="last">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generatePDF} variant="outline" className="rounded-xl h-10 gap-2 border-none bg-card shadow-sm hover:bg-muted">
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm rounded-2xl bg-primary/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Spent</p>
              <h3 className="text-2xl font-black mt-1">${totalSpent.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-emerald-500/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Remaining</p>
              <h3 className="text-2xl font-black mt-1">${(settings.monthlySalary - totalSpent).toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-blue-500/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Budget Used</p>
              <h3 className="text-2xl font-black mt-1">{((totalSpent / settings.monthlyBudget) * 100).toFixed(1)}%</h3>
            </div>
            <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
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
                  width={100} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--color-foreground)' }}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
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
                      <p className="font-black">${cat.value.toLocaleString()}</p>
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
