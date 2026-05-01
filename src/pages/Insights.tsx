import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Filter, TrendingUp, TrendingDown, Wallet, CreditCard, PieChart as PieChartIcon, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn, formatCurrency, formatCurrencyForPDF } from '@/lib/utils';

export default function Insights() {
  const { expenses, settings, categories, setCategories, insightStats, setInsightStats } = useStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
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
  const [periodType, setPeriodType] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const [year, month] = timeframe.split('-');
      try {
        const [statsRes, categoriesRes] = await Promise.all([
          fetch(`/api/stats?month=${month}&year=${year}&period=${periodType}`),
          fetch('/api/categories')
        ]);

        if (statsRes.ok) {
          setInsightStats(await statsRes.json());
        }
        if (categoriesRes.ok) {
          setCategories(await categoriesRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [timeframe, periodType, setInsightStats, setCategories]);

  const stats = insightStats;

  const filteredExpenses = useMemo(() => {
    const [year, month] = timeframe.split('-').map(Number);
    const targetDate = new Date(year, month - 1, 1);
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);
    return expenses.filter(e => isWithinInterval(new Date(e.date), { start, end }));
  }, [expenses, timeframe]);

  const categoryBreakdown = useMemo(() => {
    if (!stats) return [];
    return stats.categoryBreakdown.map((item: any) => {
      const cat = categories.find(c => c.name === item.name);
      return {
        ...item,
        color: cat?.color || '#64748b'
      };
    }).sort((a: any, b: any) => b.value - a.value);
  }, [stats, categories]);

  const generatePDF = async () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      const [year, month] = timeframe.split('-');
      const res = await fetch(`/api/expenses?month=${month}&year=${year}&limit=10000`);
      if (!res.ok) throw new Error('Failed to fetch full data for report');
      const data = await res.json();
      const allExpenses = data.expenses;

      const doc = new jsPDF('p', 'mm', 'a4');
      const now = new Date();
      const targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = format(targetDate, 'MMMM yyyy');

      // Header
      doc.setFillColor(99, 102, 241); // Indigo primary
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Insights Report', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${monthName} | Generated on ${format(now, 'PPP p')}`, 20, 32);

      // Summary Stats
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', 20, 55);
      
      autoTable(doc, {
        startY: 60,
        head: [['Metric', 'Value']],
        body: [
          ['Total Income', formatCurrencyForPDF(allExpenses.filter((e: any) => e.type === 'income').reduce((sum: number, e: any) => sum + e.amount, 0) + (stats.totalSalary || 0), settings.currency)],
          ['Total Expenses', formatCurrencyForPDF(allExpenses.filter((e: any) => e.type === 'expense').reduce((sum: number, e: any) => sum + e.amount, 0), settings.currency)],
          ['Budget Spent', formatCurrencyForPDF(stats.budgetSpent, settings.currency)],
          ['Remaining Balance', formatCurrencyForPDF(stats.remaining, settings.currency)],
          ['Budget Utilization', `${((stats.budgetSpent / settings.monthlyBudget) * 100).toFixed(1)}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: 20, right: 20 },
        styles: { font: 'helvetica' }
      });

      // Capture Chart using html-to-image
      if (chartRef.current) {
        const imgData = await toPng(chartRef.current, {
          cacheBust: true,
          // Optional: Match the background to your theme to prevent visual gaps
          backgroundColor: document.documentElement.classList.contains('dark') ? '#020817' : '#ffffff',
          pixelRatio: 2,
        });
        
        const imgProps = doc.getImageProperties(imgData);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        
        // Initial desired dimensions (full width minus margins)
        let pdfWidth = pageWidth - (margin * 2);
        let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let startY = (doc as any).lastAutoTable.finalY + 20;

        // If the image is too tall to fit on the rest of the first page...
        if (startY + pdfHeight > pageHeight - margin) {
          // 1. Move it to a brand new page
          doc.addPage();
          startY = margin + 10;
          
          // 2. If it's STILL too tall for a full page (happens on mobile layouts), scale it down
          const maxAvailableHeight = pageHeight - startY - margin;
          if (pdfHeight > maxAvailableHeight) {
            pdfHeight = maxAvailableHeight;
            // Proportionately scale the width down too
            pdfWidth = (imgProps.width * pdfHeight) / imgProps.height;
          }
        }
        
        // Center horizontally in case we scaled it down
        const xPos = (pageWidth - pdfWidth) / 2;
        
        doc.text('Spending by Category', margin, startY - 5);
        doc.addImage(imgData, 'PNG', xPos, startY, pdfWidth, pdfHeight);
        
        // Detailed Transactions on new page
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.text('Detailed Transactions', 20, 20);
        
        autoTable(doc, {
          startY: 25,
          head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
          body: allExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e: any) => [
            format(new Date(e.date), 'MMM dd, yyyy'),
            e.type === 'income' ? 'Income' : 'Expense',
            e.category,
            e.description,
            formatCurrencyForPDF(e.amount, settings.currency)
          ]),
          theme: 'grid',
          styles: { fontSize: 8, font: 'helvetica' },
          headStyles: { fillColor: [100, 100, 100] }
        });
      }

      doc.save(`Financial_Report_${monthName.replace(' ', '_')}.pdf`);
      toast.success('Financial report downloaded!');
    } catch (error) {
      console.error('PDF Generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
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
            <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
              <SelectTrigger className="w-[140px] rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm h-11 text-xs font-bold hover:bg-background transition-all">
                <Filter className="h-3.5 w-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Period">
                  {periodType === 'week' ? 'Weekly' : 
                   periodType === 'month' ? 'Monthly' : 
                   periodType === 'quarter' ? 'Quarterly' : 'Yearly'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl" sideOffset={4}>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px] md:w-[200px] rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm h-11 text-xs font-bold hover:bg-background transition-all">
                <Calendar className="h-3.5 w-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl" sideOffset={4}>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={generatePDF} 
              disabled={isExporting}
              className="rounded-xl h-11 px-6 gap-2 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
            </Button>
          </div>
        </header>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-muted animate-pulse" />
          ))
        ) : (
          <>
            <StatCard 
              title="Total Income"
              value={formatCurrency((stats?.totalSalary || 0) + (stats?.totalIncome || 0), settings.currency)}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard 
              title="Total Spent"
              value={formatCurrency(stats?.totalSpent || 0, settings.currency)}
              icon={TrendingDown}
              variant="danger"
            />
            <StatCard 
              title="Remaining"
              value={formatCurrency(stats?.remaining || 0, settings.currency)}
              icon={Wallet}
              variant="primary"
            />
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2" ref={chartRef}>
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Category Breakdown
            </CardTitle>
            <CardDescription>Where your money is going this month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
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
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
                            <div className="space-y-2">
                              {payload.map((entry: any, index: number) => {
                                const color = entry.payload.color || entry.color || entry.fill;
                                return (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                      <span className="text-sm font-bold">{entry.name}</span>
                                    </div>
                                    <span className="text-sm font-black" style={{ color: color }}>
                                      {formatCurrency(entry.value as number, settings.currency)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar name="Amount" dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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
          <CardContent className="pt-4 pb-8">
            <div className="space-y-6">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-32 bg-muted animate-pulse rounded-lg" />
                      <div className="h-8 w-16 bg-muted animate-pulse rounded-lg" />
                    </div>
                    <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
                  </div>
                ))
              ) : (
                <>
                  {categoryBreakdown.slice(0, 5).map((cat, index) => (
                    <div key={`${cat.name}-${index}`} className="space-y-2">
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
                            {((cat.value / (stats?.totalSpent || 1)) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${(cat.value / (stats?.totalSpent || 1)) * 100}%`,
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
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
