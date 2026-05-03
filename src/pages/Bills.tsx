import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle, Plus, Trash2, Receipt, Calendar as CalendarIcon, History } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStore } from '@/store/useStore';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { encryptData, decryptData, isEncrypted } from '@/lib/encryption';
import { VaultGuard } from '@/components/VaultGuard';

const billSchema = z.object({
  name: z.string().min(1, "Bill name is required"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  dueDate: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 31;
  }, {
    message: "Due date must be between 1 and 31",
  }),
});

type BillFormValues = z.infer<typeof billSchema>;

export default function Bills() {
  const { bills, setBills, addBill, toggleBillPaid, settings, vaultKey } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
  });

  const [showHistory, setShowHistory] = useState(false);

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      
      const endpoint = showHistory 
        ? `/api/bills` 
        : `/api/bills?month=${month}&year=${year}&allUnpaid=true`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const rawBills = await res.json();
        
        // Decrypt bills ONLY if vault is enabled and key is present
        const decryptedBills = rawBills.map((b: any) => {
          if (vaultKey && isEncrypted(b.name)) {
            const decrypted = decryptData(b.name, vaultKey as string);
            if (decrypted && typeof decrypted === 'object' && decrypted.isEncryptedViaVault) {
              return {
                ...b,
                amount: decrypted.amount,
                name: decrypted.name,
                isActuallyEncrypted: true
              };
            }
          }
          return b;
        });

        setBills(decryptedBills);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [showHistory, vaultKey, settings.useVault]);

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    toggleBillPaid(id);
    
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: !currentStatus }),
      });

      if (!res.ok) {
        // Rollback on error
        toggleBillPaid(id);
        toast.error('Failed to update bill');
      } else {
        toast.success(currentStatus ? 'Marked as unpaid' : 'Bill paid!');
      }
    } catch (error) {
      toggleBillPaid(id);
      toast.error('Failed to update bill');
    }
  };

  const deleteBill = async (id: string) => {
    if (!confirm('Delete this bill?')) return;
    
    // Optimistic UI
    const oldBills = [...bills];
    setBills(bills.filter(b => b.id !== id));

    try {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Bill deleted');
      } else {
        setBills(oldBills);
        toast.error('Failed to delete bill');
      }
    } catch (error) {
      setBills(oldBills);
      toast.error('Failed to delete bill');
    }
  };

  const onSubmit = async (values: BillFormValues) => {
    const rawData: any = {
      dueDate: parseInt(values.dueDate),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      isPaid: false
    };

    if (settings.useVault && vaultKey) {
      const sensitiveData = {
        name: values.name,
        amount: parseFloat(values.amount),
        isEncryptedViaVault: true
      };
      rawData.name = encryptData(JSON.stringify(sensitiveData), vaultKey);
      rawData.amount = 0; // Owner sees nothing
    } else {
      rawData.name = values.name;
      rawData.amount = parseFloat(values.amount);
    }

    // Close immediately for 'instant' feel
    setIsAddOpen(false);
    reset();

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawData),
      });

      if (res.ok) {
        const newBill = await res.json();
        
        // Decrect the local response immediately so it looks right in the UI
        let finalBill = newBill;
        if (isEncrypted(newBill.name)) {
          const decrypted = decryptData(newBill.name, vaultKey as string);
          if (decrypted && typeof decrypted === 'object' && decrypted.isEncryptedViaVault) {
            finalBill = {
              ...newBill,
              amount: decrypted.amount,
              name: decrypted.name,
              isActuallyEncrypted: true
            };
          }
        }

        addBill(finalBill);
        toast.success('Bill added successfully');
      } else {
        toast.error('Failed to add bill');
      }
    } catch (error) {
      toast.error('Failed to add bill');
    }
  };

  const today = new Date().getDate();
  const unpaidUpcoming = bills.filter(b => !b.isPaid && b.dueDate >= today && b.dueDate <= today + 5);

  return (
    <VaultGuard>
    <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-full overflow-x-hidden pb-10">
      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-4 md:p-8 border border-primary/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Receipt className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Subscriptions</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Recurring Bills</h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-md font-medium opacity-70">
              {format(new Date(), 'MMMM yyyy')} • Tracking your monthly commitments.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "rounded-xl h-11 px-4 gap-2 font-bold transition-all text-xs uppercase tracking-widest",
                showHistory ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground"
              )}
            >
              <History className="h-4 w-4" />
              <span>{showHistory ? "Hide History" : "Full History"}</span>
            </Button>
            <Button 
              onClick={() => setIsAddOpen(true)} 
              className="rounded-xl h-11 px-6 gap-2 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-widest"
            >
              <Plus className="h-4 w-4" />
              <span>Add Bill</span>
            </Button>
          </div>
        </header>
      </div>

      {unpaidUpcoming.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-destructive">Action Required</h4>
            <p className="text-xs text-destructive/80 mt-1">
              You have {unpaidUpcoming.length} bill(s) due within the next 5 days.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 px-0.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : bills.length > 0 ? (
          bills.map((bill) => (
            <Card key={bill.id} className={cn(
              "border border-border/50 shadow-sm transition-all duration-200 rounded-2xl overflow-hidden",
              bill.isPaid ? "bg-muted/10 opacity-60" : "bg-card hover:shadow-md hover:border-primary/20"
            )}>
              <CardContent className="p-4 md:p-6 flex flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                  <button 
                    onClick={() => handleTogglePaid(bill.id, bill.isPaid)}
                    className="transition-transform hover:scale-110 focus:outline-none shrink-0"
                  >
                    {bill.isPaid ? (
                      <CheckCircle2 className="h-7 w-7 md:h-8 md:h-8 text-primary fill-primary/10" />
                    ) : (
                      <Circle className="h-7 w-7 md:h-8 md:h-8 text-muted-foreground" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <h3 className={cn(
                      "font-bold text-base md:text-lg truncate",
                      bill.isPaid && "line-through text-muted-foreground"
                    )}>
                      {bill.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
                      <div className="flex items-center text-[10px] md:text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 md:py-1 rounded-lg">
                        <CalendarIcon className="h-3 w-3 mr-1 text-primary" />
                        Due on {bill.dueDate}{bill.dueDate === 1 ? 'st' : bill.dueDate === 2 ? 'nd' : bill.dueDate === 3 ? 'rd' : 'th'}
                      </div>
                      <span className="text-xs md:text-sm font-bold text-foreground">
                        {formatCurrency(bill.amount, settings.currency)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
                  {!bill.isPaid && bill.dueDate <= today + 3 && (
                    <Badge variant="destructive" className="rounded-lg px-1.5 py-0.5 text-[8px] md:text-[10px] font-bold animate-pulse">
                      DUE
                    </Badge>
                  )}
                  <button 
                    onClick={() => deleteBill(bill.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="bg-card border border-dashed rounded-2xl py-16 text-center">
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold">No recurring bills</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your first bill to start tracking.</p>
            <Button 
              variant="outline" 
              onClick={() => setIsAddOpen(true)}
              className="mt-6 rounded-xl"
            >
              Add Bill
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Recurring Bill</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Bill Name</Label>
                <Input 
                  id="name" 
                  placeholder="Rent, Netflix, Gym, etc." 
                  className="rounded-xl bg-muted/50 border-none h-11"
                  {...register('name')} 
                />
                {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">Monthly Amount ({settings.currency})</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  className="rounded-xl bg-muted/50 border-none h-11"
                  {...register('amount')} 
                />
                {errors.amount && <p className="text-xs text-destructive font-medium">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-sm font-semibold">Due Date (Day of Month)</Label>
                <Input 
                  id="dueDate" 
                  type="number" 
                  min="1" 
                  max="31" 
                  placeholder="15"
                  className="rounded-xl bg-muted/50 border-none h-11"
                  {...register('dueDate')} 
                />
                {errors.dueDate && <p className="text-xs text-destructive font-medium">{errors.dueDate.message}</p>}
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                {isSubmitting ? 'Saving...' : 'Save Bill'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </VaultGuard>
  );
}
