import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Search, Filter, Trash2, Download, Plus, Calendar as CalendarIcon, ChevronRight, X, Calendar, Wallet, TrendingUp, TrendingDown, ChevronLeft } from 'lucide-react';
import { format, subMonths } from 'date-fns';
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
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function Transactions() {
  const { categories, setCategories, removeExpense, settings, expenses: storeExpenses, setExpenses: setStoreExpenses } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
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

  const [timeframe, setTimeframe] = useState(months[0].value);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(!storeExpenses.length);

  const fetchExpenses = async () => {
    if (!storeExpenses.length) setIsLoading(true);
    try {
      const [year, month] = timeframe.split('-');
      const params = new URLSearchParams({
        month,
        year,
        page: currentPage.toString(),
        limit: '20',
      });
      
      const [expensesRes, categoriesRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`),
        fetch('/api/categories')
      ]);

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setStoreExpenses(data.expenses);
        setTotalPages(data.pagination.pages);
      }
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [timeframe, currentPage]);

  const expenses = storeExpenses;

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, selectedCategory]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        removeExpense(id);
        toast.success('Transaction deleted');
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
  };

  const downloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date();
    const timeframeLabel = months.find(m => m.value === timeframe)?.label || timeframe;
    
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
    const totalIncome = filteredExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = filteredExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
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
      body: filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => [
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

    doc.save(`Financial_Report_${timeframeLabel.replace(' ', '_')}.pdf`);
    toast.success('Expense report downloaded!');
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-0">
      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-6 md:p-8 border border-primary/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Transactions</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Expenses</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md">
              Manage and track all your spending with detailed history.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <Select value={timeframe} onValueChange={(val) => { setTimeframe(val); setCurrentPage(1); }}>
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

            <Button variant="outline" onClick={downloadPDF} className="rounded-xl gap-2 h-11 flex-1 md:flex-none border-none bg-background/50 backdrop-blur-sm shadow-sm text-xs md:text-sm font-bold">
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="rounded-xl gap-2 shadow-lg shadow-primary/20 h-11 flex-1 md:flex-none text-xs md:text-sm font-bold transition-all hover:scale-105 active:scale-95">
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span>Add Transaction</span>
            </Button>
          </div>
        </header>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search in this month..." 
              className="pl-10 rounded-xl bg-card border-none shadow-sm h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={showFilters ? "secondary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "rounded-xl h-11 gap-2 px-4 border-none bg-card shadow-sm",
                showFilters && "bg-primary/10 text-primary"
              )}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {selectedCategory !== 'All' && (
                <span className="bg-primary text-primary-foreground text-[10px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </Button>
            {(searchTerm || selectedCategory !== 'All') && (
              <Button variant="ghost" onClick={clearFilters} className="rounded-xl h-11 px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-card border-none shadow-sm rounded-2xl p-4 md:p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {['All', ...categories.map(c => c.name)].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                      selectedCategory === cat 
                        ? "bg-primary text-primary-foreground border-primary shadow-md" 
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

      <div className="bg-card border-none shadow-sm rounded-2xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" />
                    </td>
                    <td className="px-6 py-4" />
                  </tr>
                ))
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => {
                  const category = categories.find(c => c.name === expense.category);
                  const isIncome = expense.type === 'income';
                  return (
                    <tr key={expense.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: category?.color || (isIncome ? '#10b981' : '#64748b') }}
                          >
                            {isIncome ? <TrendingUp className="h-5 w-5" /> : <span className="text-xs font-bold">{expense.category.charAt(0)}</span>}
                          </div>
                          <span className="font-bold group-hover:text-primary transition-colors">
                            {expense.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn("font-bold", isIncome ? "text-emerald-500" : "text-destructive")}>
                          {isIncome ? '+' : '-'}{formatCurrency(expense.amount, settings.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No transactions found for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-2 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-8 w-8 rounded-xl bg-muted animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-muted animate-pulse rounded" />
              </div>
            ))
          ) : filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => {
              const category = categories.find(c => c.name === expense.category);
              const isIncome = expense.type === 'income';
              return (
                <div key={expense.id} className="px-2 py-3 md:p-4 flex items-center justify-between active:bg-muted/50 transition-colors gap-2 md:gap-3">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div 
                      className="h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                      style={{ backgroundColor: category?.color || (isIncome ? '#10b981' : '#64748b') }}
                    >
                      {isIncome ? <TrendingUp className="h-4 w-4 md:h-5 md:w-5" /> : <span className="text-[10px] md:text-xs font-bold">{expense.category.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-xs md:text-base leading-tight">{expense.description}</p>
                      <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium truncate max-w-[50px] md:max-w-[100px]">{expense.category}</span>
                        <span>•</span>
                        <span className="shrink-0">{format(new Date(expense.date), 'MMM dd')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    <span className={cn("font-bold text-xs md:text-base whitespace-nowrap", isIncome ? "text-emerald-500" : "text-destructive")}>
                      {isIncome ? '+' : '-'}{formatCurrency(expense.amount, settings.currency)}
                    </span>
                    <button 
                      onClick={() => handleDelete(expense.id)}
                      className="p-1.5 md:p-2 text-muted-foreground hover:text-destructive active:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No transactions found.
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
        onSuccess={fetchExpenses} 
      />
    </div>
  );
}
