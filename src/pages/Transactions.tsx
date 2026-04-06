import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Search, Filter, Trash2, Download, Plus, Calendar as CalendarIcon, ChevronRight, X, Calendar, Wallet } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, formatCurrency } from '@/lib/utils';
import { QuickAddExpense } from '@/components/dashboard/QuickAddExpense';

export default function Transactions() {
  const { expenses, categories, removeExpense, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
      
      let matchesDate = true;
      if (startDate || endDate) {
        const expenseDate = new Date(e.date);
        const start = startDate ? startOfDay(parseISO(startDate)) : new Date(0);
        const end = endDate ? endOfDay(parseISO(endDate)) : new Date(8640000000000000);
        matchesDate = isWithinInterval(expenseDate, { start, end });
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [expenses, searchTerm, selectedCategory, startDate, endDate]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        removeExpense(id);
        toast.success('Expense deleted');
      }
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setStartDate('');
    setEndDate('');
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Expense Report', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: filteredExpenses.map(e => [
        format(new Date(e.date), 'MMM dd, yyyy'),
        e.category,
        e.description,
        formatCurrency(e.amount, settings.currency)
      ]),
    });
    doc.save('expenses.pdf');
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
          
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={downloadPDF} className="rounded-xl gap-2 h-11 flex-1 md:flex-none border-none bg-background/50 backdrop-blur-sm shadow-sm text-xs md:text-sm font-bold">
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="rounded-xl gap-2 shadow-lg shadow-primary/20 h-11 flex-1 md:flex-none text-xs md:text-sm font-bold transition-all hover:scale-105 active:scale-95">
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span>Add Expense</span>
            </Button>
          </div>
        </header>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
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
              {(selectedCategory !== 'All' || startDate || endDate) && (
                <span className="bg-primary text-primary-foreground text-[10px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </Button>
            {(searchTerm || selectedCategory !== 'All' || startDate || endDate) && (
              <Button variant="ghost" onClick={clearFilters} className="rounded-xl h-11 px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-card border-none shadow-sm rounded-2xl p-4 md:p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Start Date
                </label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl bg-card border border-border shadow-sm h-11 font-medium focus:bg-background transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  End Date
                </label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl bg-card border border-border shadow-sm h-11 font-medium focus:bg-background transition-all"
                />
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
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Expense</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => {
                  const category = categories.find(c => c.name === expense.category);
                  return (
                    <tr key={expense.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: category?.color || '#64748b' }}
                          >
                            <span className="text-xs font-bold">{expense.category.charAt(0)}</span>
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
                        <span className="font-bold text-destructive">
                          -{formatCurrency(expense.amount, settings.currency)}
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
                    No expenses found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => {
              const category = categories.find(c => c.name === expense.category);
              return (
                <div key={expense.id} className="px-2 py-3 md:p-4 flex items-center justify-between active:bg-muted/50 transition-colors gap-2 md:gap-3">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div 
                      className="h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                      style={{ backgroundColor: category?.color || '#64748b' }}
                    >
                      <span className="text-[10px] md:text-xs font-bold">{expense.category.charAt(0)}</span>
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
                    <span className="font-bold text-destructive text-xs md:text-base whitespace-nowrap">
                      -{formatCurrency(expense.amount, settings.currency)}
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
              No expenses found.
            </div>
          )}
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
