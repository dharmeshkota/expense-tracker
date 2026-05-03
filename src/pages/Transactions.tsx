import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Search, Filter, Trash2, Download, Plus, Calendar as CalendarIcon, ChevronRight, X, Calendar, Wallet, TrendingUp, TrendingDown, ChevronLeft, Loader2, Lock as VaultLock } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, formatCurrency, formatCurrencyForPDF } from '@/lib/utils';
import { QuickAddExpense } from '@/components/dashboard/QuickAddExpense';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decryptData, isEncrypted } from '@/lib/encryption';
import { VaultGuard } from '@/components/VaultGuard';

export default function Transactions() {
  const { categories, setCategories, settings, vaultKey } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  // Date range state
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('month');

  // Helper to get date ranges
  const getDateRangeForType = (type: string) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (type) {
      case 'week': {
        const day = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'month': {
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      }
      case 'quarter': {
        const month = now.getMonth();
        const quarterStartMonth = Math.floor(month / 3) * 3;
        start = new Date(now.getFullYear(), quarterStartMonth, 1);
        end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
        break;
      }
      case 'year': {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      }
      default:
        return null;
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };
  };

  // Pagination & Month Filtering
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

  const [timeframe, setTimeframe] = useState('custom'); // We keep this as custom because we use the dateRange by default now
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize with current month
  useEffect(() => {
    const range = getDateRangeForType('month');
    if (range) {
      setDateRange(range);
      setActiveFilter('month');
    }
  }, []);

  const { data: transactionsData, isLoading, isFetching } = useQuery({
    queryKey: ['expenses', timeframe, currentPage, dateRange, vaultKey, settings.useVault],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (dateRange) {
        params.append('startDate', dateRange.start);
        params.append('endDate', dateRange.end);
      } else if (timeframe !== 'custom') {
        const [year, month] = timeframe.split('-');
        params.append('month', month);
        params.append('year', year);
      }
      
      const [expensesRes, categoriesRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`),
        fetch('/api/categories')
      ]);

      if (!expensesRes.ok || !categoriesRes.ok) throw new Error('Failed to fetch data');

      const [expensesData, cats] = await Promise.all([
        expensesRes.json(),
        categoriesRes.json()
      ]);

      // Decrypt data ONLY if vault key is present AND vault is enabled in settings
      const decryptedExpenses = expensesData.expenses.map((e: any) => {
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
              description: decrypted.description + (e.description.includes(' (Split)') ? ' (Split)' : ''),
              isActuallyEncrypted: true
            };
          }
        }
        return e;
      });

      setCategories(cats);
      return {
        ...expensesData,
        expenses: decryptedExpenses
      };
    },
    enabled: !settings.useVault || !!vaultKey,
    staleTime: 30000,
  });

  const expenses = transactionsData?.expenses || [];
  const totalPages = transactionsData?.pagination.pages || 1;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete transaction');
      return id;
    },
    onSuccess: () => {
      toast.success('Transaction deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error('Failed to delete transaction');
    }
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e: any) => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, selectedCategory]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate(id);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    const range = getDateRangeForType('month');
    if (range) setDateRange(range);
    setActiveFilter('month');
    setTimeframe('custom');
  };

  const downloadPDF = async () => {
    const toastId = toast.loading('Preparing full report...');
    try {
      const params = new URLSearchParams({ limit: '10000' });
      if (dateRange) {
        params.append('startDate', dateRange.start);
        params.append('endDate', dateRange.end);
      } else {
        const [year, month] = timeframe.split('-');
        params.append('month', month);
        params.append('year', year);
      }

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch all expenses');
      
      const data = await res.json();
      const rawExpenses = data.expenses;

      // Decrypt data for the report
      const allExpenses = rawExpenses.map((e: any) => {
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
              description: decrypted.description + (e.description.includes(' (Split)') ? ' (Split)' : '')
            };
          }
        }
        return e;
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const now = new Date();
      const timeframeLabel = dateRange 
        ? `${format(new Date(dateRange.start), 'MMM dd, yyyy')} - ${format(new Date(dateRange.end), 'MMM dd, yyyy')}`
        : months.find(m => m.value === timeframe)?.label || timeframe;
      
      // Header
      doc.setFillColor(99, 102, 241); // Indigo primary
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Report', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${timeframeLabel} | Generated on ${format(now, 'PPP p')}`, 20, 32);

      // Summary Section
      const totalIncome = allExpenses.filter((e: any) => e.type === 'income').reduce((sum: number, e: any) => sum + e.amount, 0);
      const totalExpenses = allExpenses.filter((e: any) => e.type === 'expense').reduce((sum: number, e: any) => sum + e.amount, 0);
      const balance = totalIncome - totalExpenses;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Summary', 20, 55);
      
      autoTable(doc, {
        startY: 60,
        head: [['Metric', 'Amount']],
        body: [
          ['Total Income', formatCurrencyForPDF(totalIncome, settings.currency)],
          ['Total Expenses', formatCurrencyForPDF(totalExpenses, settings.currency)],
          ['Net Balance', formatCurrencyForPDF(balance, settings.currency)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: 20, right: 20 },
        styles: { font: 'helvetica', fontSize: 10 }
      });

      // Transactions Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Details', 20, (doc as any).lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
        body: allExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e: any) => [
          format(new Date(e.date), 'MMM dd, yyyy'),
          e.type === 'income' ? 'Income' : 'Expense',
          e.category,
          e.description,
          `${e.type === 'income' ? '+' : '-'}${formatCurrencyForPDF(e.amount, settings.currency)}`
        ]),
        theme: 'grid',
        styles: { fontSize: 9, font: 'helvetica', cellPadding: 3 },
        headStyles: { fillColor: [71, 85, 105], fontSize: 10, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 20 },
          2: { cellWidth: 30 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const val = data.cell.raw as string;
            if (val.startsWith('+')) {
              data.cell.styles.textColor = [16, 185, 129]; // emerald-500
            } else if (val.startsWith('-')) {
              data.cell.styles.textColor = [239, 68, 68]; // destructive/red-500
            }
          }
        }
      });

      doc.save(`Expense_Report_${timeframeLabel.replace(' ', '_')}.pdf`);
      toast.dismiss(toastId);
      toast.success('Full expense report downloaded!');
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Failed to generate full report');
      console.error(error);
    }
  };

  return (
    <VaultGuard>
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden">
      <div className="relative rounded-[1.25rem] md:rounded-[2.5rem] bg-[#0a0c14]/40 border border-primary/20 p-3.5 md:p-10 shadow-2xl shadow-primary/5 backdrop-blur-xl mb-4 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute inset-0 rounded-[1.25rem] md:rounded-[2.5rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 md:h-96 md:w-96 rounded-full bg-primary/20 blur-[80px] md:blur-[120px] opacity-60 animate-pulse" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-48 w-48 md:h-64 md:w-64 rounded-full bg-primary/10 blur-[60px] md:blur-[80px] opacity-40" />
        </div>
        
        <div className="relative z-10 space-y-6 md:space-y-10">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <div className="p-1.5 bg-primary/20 rounded-lg border border-primary/30 shadow-inner">
                  <Wallet className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-90">Ledger Journal</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-none">Expenses</h1>
                <p className="text-xs md:text-base text-muted-foreground font-medium opacity-60 leading-relaxed max-w-md">
                  Spend velocity and historical tracking for your personal economy.
                </p>
              </div>
            </div>


              <div className="flex flex-row items-center gap-2.5 w-full lg:w-auto">
                <Button 
                  variant="outline" 
                  onClick={downloadPDF} 
                  className="rounded-xl h-11 md:h-[52px] px-3 md:px-6 gap-2 border-primary/20 bg-background/40 backdrop-blur-md shadow-sm font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all active:scale-95 text-foreground/80 flex-1 lg:flex-none"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="truncate">Export</span>
                </Button>
                <Button 
                  onClick={() => setIsAddOpen(true)} 
                  className="rounded-xl h-11 md:h-[52px] px-4 md:px-8 gap-2 font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:translate-y-[-1px] active:scale-95 bg-primary text-primary-foreground border-none flex-1 lg:flex-none"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="truncate">New Entry</span>
                </Button>
              </div>
          </header>


          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="relative group w-full">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center bg-background/30 backdrop-blur-md p-1 rounded-[1rem] border border-primary/15 shadow-inner w-full md:w-fit overflow-hidden">
                  <div className="flex items-center gap-0.5 md:gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 px-1 py-0.5 min-w-0">
                    {[
                      { id: 'week', label: 'Week' },
                      { id: 'month', label: 'Month' },
                      { id: 'quarter', label: 'Quarter' },
                      { id: 'year', label: 'Year' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveFilter(f.id);
                          const range = getDateRangeForType(f.id);
                          if (range) setDateRange(range);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "px-2 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-widest transition-all whitespace-nowrap md:flex-none text-center min-w-0 flex-1",
                          activeFilter === f.id 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                    <div className="w-[1px] h-3 bg-primary/20 shrink-0 mx-0.5 md:mx-1" />
                    <Select value={timeframe} onValueChange={(val) => { 
                      setTimeframe(val); 
                      setCurrentPage(1);
                      if (val !== 'custom') {
                        setActiveFilter('');
                        setDateRange(null);
                      } else {
                        setActiveFilter('');
                        if (!dateRange) {
                          const range = getDateRangeForType('month');
                          if (range) setDateRange(range);
                        }
                      }
                    }}>
                      <SelectTrigger className="border-none bg-transparent h-7 md:h-10 w-auto hover:bg-primary/5 transition-all focus:ring-0 focus:ring-offset-0 gap-1 px-1 shrink-0">
                        <div className={cn(
                          "text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-widest transition-all",
                          timeframe !== 'custom' ? "text-primary" : "text-muted-foreground opacity-60"
                        )}>
                          {timeframe === 'custom' ? 'Journal' : months.find(m => m.value === timeframe)?.label || 'Journal'}
                        </div>
                      </SelectTrigger>

                      <SelectContent className="rounded-2xl border-primary/10 shadow-2xl bg-[#0a0c14]/95 backdrop-blur-xl">
                        <SelectItem value="custom" className="text-[10px] font-black uppercase tracking-widest p-3 text-foreground">Custom Range</SelectItem>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-[10px] font-bold p-3 text-foreground">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {timeframe === 'custom' && !['week', 'month', 'quarter', 'year'].includes(activeFilter) && (
                <div className="p-3 md:p-8 bg-background/20 backdrop-blur-sm rounded-[1rem] md:rounded-[2rem] border border-primary/10 animate-in slide-in-from-top-4 duration-500 shadow-xl overflow-hidden">
                  <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-end">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-8 w-full">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 ml-1">
                          <CalendarIcon className="h-3 w-3 text-primary/60" />
                          <label className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">Source</label>
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/30 pointer-events-none" />
                          <Input 
                            type="date" 
                            value={dateRange?.start || ''} 
                            onChange={(e) => {
                              setDateRange(prev => ({ start: e.target.value, end: prev?.end || '' }));
                              setActiveFilter('');
                            }}
                            className="h-10 md:h-12 pl-10 rounded-xl bg-background/40 border-primary/10 shadow-inner text-[10px] md:text-xs font-bold focus:ring-2 focus:ring-primary/10 transition-all text-foreground/90 w-full"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 ml-1">
                          <CalendarIcon className="h-3 w-3 text-primary/60" />
                          <label className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">Target</label>
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/30 pointer-events-none" />
                          <Input 
                            type="date" 
                            value={dateRange?.end || ''} 
                            onChange={(e) => {
                              setDateRange(prev => ({ start: prev?.start || '', end: e.target.value }));
                              setActiveFilter('');
                            }}
                            className="h-10 md:h-12 pl-10 rounded-xl bg-background/40 border-primary/10 shadow-inner text-[10px] md:text-xs font-bold focus:ring-2 focus:ring-primary/10 transition-all text-foreground/90 w-full"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {activeFilter && (
                      <div className="flex items-center lg:pb-0.5">
                        <div className="flex items-center gap-2 px-4 py-2.5 h-10 bg-primary/15 rounded-xl border border-primary/25 shadow-inner transition-all w-full lg:w-auto justify-center">
                          <div className="h-1 w-1 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                          <span className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest truncate">
                            Pulse: <span className="opacity-70">{activeFilter}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      <div className="space-y-6">
        <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-2xl border border-border/30 backdrop-blur-sm">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search ledger..." 
              className="pl-11 rounded-xl bg-background/50 border-none shadow-sm h-12 text-sm font-medium placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant={showFilters ? "secondary" : "ghost"} 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "rounded-xl h-12 px-4 md:px-6 gap-2 font-black text-[10px] uppercase tracking-widest transition-all",
                showFilters ? "bg-primary/15 text-primary border border-primary/30" : "hover:bg-primary/5 text-muted-foreground border border-transparent"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {selectedCategory !== 'All' && (
                <div className="h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-black animate-bounce shrink-0">
                  !
                </div>
              )}
            </Button>
            {(searchTerm || selectedCategory !== 'All' || timeframe !== 'custom' || activeFilter !== 'month') && (
              <Button 
                variant="outline" 
                onClick={clearFilters} 
                className="rounded-xl h-12 px-3 md:px-4 font-black text-[10px] uppercase tracking-widest border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>


        {showFilters && (
          <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-6 space-y-6 animate-in slide-in-from-top-2 duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Filter className="h-20 w-20" />
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  Filter by category
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', ...categories.map(c => c.name)].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      selectedCategory === cat 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border-none shadow-sm rounded-2xl overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Transaction Details</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 text-center">Category</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Journal Date</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 text-right">Value</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y border-t-0">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-7 w-24 bg-muted animate-pulse rounded-full mx-auto" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="h-5 w-20 bg-muted animate-pulse rounded ml-auto" />
                    </td>
                    <td className="px-6 py-5" />
                  </tr>
                ))
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense, index) => {
                  const category = categories.find(c => c.name === expense.category);
                  const isIncome = expense.type === 'income';
                  const isExpanded = expandedRows.has(expense.id);
                  
                  return (
                    <tr key={`${expense.id}-${index}`} className="group hover:bg-muted/40 transition-all">
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-soft relative shrink-0"
                            style={{ backgroundColor: category?.color || (isIncome ? '#10b981' : '#64748b') }}
                          >
                            {isIncome ? <TrendingUp className="h-5 w-5" /> : <span className="text-sm font-black">{expense.category.charAt(0)}</span>}
                            {expense.isActuallyEncrypted && (
                              <div className="absolute -top-1.5 -right-1.5 bg-primary border-4 border-[#12141c] rounded-full p-1 shadow-lg">
                                <VaultLock className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[280px]">
                            <div 
                              className={cn(
                                "font-bold text-sm tracking-tight transition-colors cursor-pointer break-all",
                                isExpanded ? "text-primary" : "truncate"
                              )}
                              onClick={() => toggleRow(expense.id)}
                            >
                              {expense.description}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{isIncome ? 'Credit' : 'Debit'}</span>
                                {expense.description.length > 30 && (
                                  <button 
                                    onClick={() => toggleRow(expense.id)}
                                    className="text-[9px] font-black uppercase text-primary/60 hover:text-primary transition-colors"
                                  >
                                    {isExpanded ? 'Collapse' : 'Show Full'}
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-muted/60 text-muted-foreground/80 border border-border/40">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-foreground/80">
                            {format(new Date(expense.date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className={cn("text-base font-black tracking-tighter tabular-nums", isIncome ? "text-emerald-500" : "text-destructive")}>
                          {isIncome ? '+' : '-'}{formatCurrency(expense.amount, settings.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDelete(expense.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all disabled:opacity-50"
                          >
                            {deleteMutation.isPending && deleteMutation.variables === expense.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-muted/20 rounded-full border border-dashed border-muted-foreground/20">
                         <Search className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground/60">No transactions found in this ledger.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border/30 w-full bg-card/40 backdrop-blur-md">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-2xl bg-muted animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-5 w-14 bg-muted animate-pulse rounded" />
              </div>
            ))
          ) : filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense, index) => {
              const category = categories.find(c => c.name === expense.category);
              const isIncome = expense.type === 'income';
              const isExpanded = expandedRows.has(expense.id);
              
              return (
                <div 
                  key={`${expense.id}-${index}`} 
                  className={cn(
                    "px-4 py-5 flex flex-col transition-all",
                    isExpanded ? "bg-muted/30" : "active:bg-muted/50"
                  )}
                  onClick={() => toggleRow(expense.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div 
                        className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-soft shrink-0 relative"
                        style={{ backgroundColor: category?.color || (isIncome ? '#10b981' : '#64748b') }}
                      >
                        {isIncome ? <TrendingUp className="h-5 w-5" /> : <span className="text-sm font-black">{expense.category.charAt(0)}</span>}
                        {expense.isActuallyEncrypted && (
                          <div className="absolute -top-1.5 -right-1.5 bg-primary border-4 border-[#12141c] rounded-full p-1 shadow-lg">
                            <VaultLock className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "font-black text-sm tracking-tight text-foreground break-all leading-tight mb-1 transition-all",
                          isExpanded ? "" : "line-clamp-1"
                        )}>
                          {expense.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">
                          <span className="px-1.5 py-0.5 bg-muted rounded-md border border-border/30 text-primary/70">{expense.category}</span>
                          <span className="opacity-40">•</span>
                          <span className="shrink-0">{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={cn("font-black text-base tracking-tighter tabular-nums", isIncome ? "text-emerald-500" : "text-foreground")}>
                        {isIncome ? '+' : '-'}{formatCurrency(expense.amount, settings.currency)}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(expense.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive active:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleteMutation.isPending && deleteMutation.variables === expense.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && expense.description.length > 20 && (
                     <div className="mt-4 pt-4 border-t border-border/30 flex justify-end">
                        <button 
                          className="text-[9px] font-black uppercase tracking-widest text-primary/60"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(expense.id);
                          }}
                        >
                          Hide Details
                        </button>
                     </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-16 text-center">
               <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
               <p className="text-sm font-bold text-muted-foreground/40">No transactions recorded.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination className={cn(isLoading && "pointer-events-none opacity-50")}>
            <PaginationContent>
              <PaginationItem>
                <Button 
                  variant="ghost" 
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="gap-1 pl-2.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink 
                    isActive={currentPage === page}
                    onClick={() => !isLoading && setCurrentPage(page)}
                    className={cn("cursor-pointer", isLoading && "cursor-not-allowed")}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <Button 
                  variant="ghost" 
                  disabled={currentPage === totalPages || isLoading}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="gap-1 pr-2.5"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <QuickAddExpense 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
      />
    </div>
    </VaultGuard>
  );
}
