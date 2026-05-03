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
import { VaultGuard } from '@/components/VaultGuard';
import { decryptData, isEncrypted } from '@/lib/encryption';

export default function Insights() {
  const { expenses, settings, categories, setCategories, insightStats, setInsightStats, vaultKey } = useStore();
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
        const [statsRes, categoriesRes, rawExpensesRes] = await Promise.all([
          fetch(`/api/stats?month=${month}&year=${year}&period=${periodType}`),
          fetch('/api/categories'),
          fetch(`/api/expenses?month=${month}&year=${year}&limit=1000`)
        ]);

        let cats = [];
        if (categoriesRes.ok) {
          cats = await categoriesRes.json();
          setCategories(cats);
        }

        if (statsRes.ok && rawExpensesRes.ok) {
          const serverStats = await statsRes.json();
          const expensesData = await rawExpensesRes.json();
          const rawExpenses = expensesData.expenses;

          // Decrypt expenses if vaultKey is available
          const decryptedExpenses = rawExpenses.map((e: any) => {
            if (vaultKey && isEncrypted(e.description)) {
              // Try personal vault key first
              let decrypted = decryptData(e.description, vaultKey as string);
              
              // If decryption fails and it's a group expense, try group-shared key (derived from groupId)
              if (!decrypted && e.groupId) {
                decrypted = decryptData(e.description, e.groupId);
              }

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

          // Recalculate stats locally if vault mode is active and key is present
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

            setInsightStats({
              ...serverStats,
              totalIncome,
              totalSpent,
              budgetSpent,
              remaining: (serverStats.totalSalary || 0) + totalIncome - totalSpent,
              categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
            });
          } else {
            setInsightStats(serverStats);
          }
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [timeframe, periodType, setInsightStats, setCategories, vaultKey]);

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
      const rawExpenses = data.expenses;

      // Decrypt for the report if vault key is available
      const allExpenses = rawExpenses.map((e: any) => {
        if (vaultKey && isEncrypted(e.description)) {
          let decrypted = decryptData(e.description, vaultKey as string);
          if (!decrypted && e.groupId) {
            decrypted = decryptData(e.description, e.groupId);
          }

          if (decrypted && typeof decrypted === 'object' && decrypted.isEncryptedViaVault) {
            return {
              ...e,
              amount: decrypted.amount,
              description: decrypted.description + (e.description.includes(' (Split)') ? ' (Split)' : '')
            };
          }
        }
        return e;
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const now = new Date();
      const targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = format(targetDate, 'MMMM yyyy');

      // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
      // Branding Header
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 50, 'F');
      
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Statement', 20, 25);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`${monthName.toUpperCase()} • CONSOLIDATED REPORT`, 20, 34);
      doc.text(`ISSUED: ${format(now, 'PPP')}`, 20, 40);

      // Accent Line
      doc.setFillColor(99, 102, 241); // Indigo-500
      doc.rect(0, 48, 210, 2, 'F');

      // Summary Title
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 20, 70);

      // Summary Table
      autoTable(doc, {
        startY: 75,
        head: [['Performance Indicator', 'Amount', 'Status']],
        body: [
          ['Total Earned (Income)', formatCurrencyForPDF(allExpenses.filter((e: any) => e.type === 'income').reduce((sum: number, e: any) => sum + e.amount, 0) + (stats.totalSalary || 0), settings.currency), 'Credit'],
          ['Total Outflow (Expenses)', formatCurrencyForPDF(allExpenses.filter((e: any) => e.type === 'expense').reduce((sum: number, e: any) => sum + e.amount, 0), settings.currency), 'Debit'],
          ['Budget Allocation Spent', formatCurrencyForPDF(stats.budgetSpent, settings.currency), stats.budgetSpent > (settings.monthlyBudget * 0.9) ? 'Critical' : 'Stable'],
          ['Net Liquidity (Remaining)', formatCurrencyForPDF(stats.remaining, settings.currency), stats.remaining < 0 ? 'Deficit' : 'Surplus'],
          ['Efficiency (Utilization)', `${((stats.budgetSpent / settings.monthlyBudget) * 100).toFixed(1)}%`, 'Operational'],
        ],
        theme: 'striped',
        headStyles: { 
          fillColor: [30, 41, 59],
          fontSize: 11,
          fontStyle: 'bold',
          cellPadding: 5
        },
        styles: { 
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 5,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { halign: 'right', fontStyle: 'bold' },
          2: { halign: 'center' }
        },
        margin: { left: 20, right: 20 }
      });

      // --- CAPTURE & DASHBOARD SECTION ---
      if (chartRef.current) {
        // High-Fidelity Capture with forced Desktop Resolution and fixed aspect ratio
        // to prevent "voids" on mobile and "clipping" on desktop
        const imgData = await toPng(chartRef.current, {
          cacheBust: true,
          backgroundColor: '#020617',
          pixelRatio: 2,
          width: 1400,
          height: 600,
          style: {
            width: '1400px',
            height: '600px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '32px',
            padding: '40px',
            background: '#020617',
            margin: '0',
          }
        });
        
        const imgProps = doc.getImageProperties(imgData);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        
        const pdfWidth = pageWidth - (margin * 2);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let startY = (doc as any).lastAutoTable.finalY + 25;

        // Visual separator
        doc.setDrawColor(226, 232, 240);
        doc.line(20, startY - 10, 190, startY - 10);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Spending Intelligence Visualization', margin, startY);
        
        // Background card for image - matched to the capture background
        doc.setFillColor(2, 6, 23); 
        doc.rect(margin, startY + 5, pdfWidth, pdfHeight, 'F');
        doc.addImage(imgData, 'PNG', margin, startY + 5, pdfWidth, pdfHeight);
      }

      // --- TRANSACTIONS JOURNAL ---
      doc.addPage();
      
      // Page Header for Journal
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 20, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Transaction Ledger Journal', 20, 13);
      
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Detailed Activity Record', 20, 35);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Comprehensive record of all entries for ${monthName}`, 20, 41);

      autoTable(doc, {
        startY: 48,
        head: [['Date', 'Classification', 'Category', 'Description', 'Net Value']],
        body: allExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e: any) => [
          format(new Date(e.date), 'MMM dd, yyyy'),
          e.type === 'income' ? 'CREDIT' : 'DEBIT',
          e.category.toUpperCase(),
          e.description.length > 70 ? e.description.substring(0, 67) + '...' : e.description,
          `${e.type === 'income' ? '+' : '-'}${formatCurrencyForPDF(e.amount, settings.currency)}`
        ]),
        theme: 'striped',
        styles: { 
          fontSize: 8.5, 
          font: 'helvetica',
          cellPadding: 4,
          textColor: [51, 65, 85]
        },
        headStyles: { 
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 6
        },
        columnStyles: {
          0: { cellWidth: 32, halign: 'center' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 35, fontStyle: 'bold' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const val = data.cell.raw as string;
            if (val.startsWith('+')) data.cell.styles.textColor = [16, 185, 129];
            else if (val.startsWith('-')) data.cell.styles.textColor = [225, 29, 72];
          }
          if (data.section === 'body' && data.column.index === 1) {
            const type = data.cell.raw as string;
            if (type === 'CREDIT') data.cell.styles.textColor = [5, 150, 105];
            else data.cell.styles.textColor = [71, 85, 105];
          }
        },
        margin: { left: 20, right: 20 }
      });

      // --- GLOBAL FOOTER ---
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, 185, 290);
        doc.text('© PRIVACY VAULT SECURED LEDGER • CONFIDENTIAL', 20, 290);
        doc.setDrawColor(241, 245, 249);
        doc.line(20, 286, 190, 286);
      }

      doc.save(`FINANCIAL_STATEMENT_${monthName.replace(' ', '_').toUpperCase()}.pdf`);
      toast.success('High-fidelity report generated successfully!');
    } catch (error) {
      console.error('PDF Generation error:', error);
      toast.error('Synthesis failure during PDF generation');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <VaultGuard>
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
    </VaultGuard>
  );
}
