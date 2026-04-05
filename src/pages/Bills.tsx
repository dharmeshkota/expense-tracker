import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle, Plus, Trash2, Receipt, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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
  const { bills, setBills, addBill, toggleBillPaid } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
  });

  const fetchBills = async () => {
    try {
      const res = await fetch('/api/bills');
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: !currentStatus }),
      });

      if (res.ok) {
        toggleBillPaid(id);
        toast.success(currentStatus ? 'Marked as unpaid' : 'Bill paid!');
      }
    } catch (error) {
      toast.error('Failed to update bill');
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBills(bills.filter(b => b.id !== id));
        toast.success('Bill deleted');
      }
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  const onSubmit = async (values: BillFormValues) => {
    const data = {
      name: values.name,
      amount: parseFloat(values.amount),
      dueDate: parseInt(values.dueDate),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      isPaid: false
    };

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newBill = await res.json();
        addBill(newBill);
        toast.success('Bill added successfully');
        reset();
        setIsAddOpen(false);
      }
    } catch (error) {
      toast.error('Failed to add bill');
    }
  };

  const today = new Date().getDate();
  const unpaidUpcoming = bills.filter(b => !b.isPaid && b.dueDate >= today && b.dueDate <= today + 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Bills</h1>
          <p className="text-muted-foreground mt-1">Manage your monthly commitments and subscriptions.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="rounded-xl h-10 px-4 gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          <span>Add Bill</span>
        </Button>
      </header>

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

      <div className="grid gap-4">
        {bills.length > 0 ? (
          bills.map((bill) => (
            <Card key={bill.id} className={cn(
              "border-none shadow-sm transition-all duration-200 rounded-2xl overflow-hidden",
              bill.isPaid ? "bg-muted/30 opacity-60" : "bg-card hover:shadow-md"
            )}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => handleTogglePaid(bill.id, bill.isPaid)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    {bill.isPaid ? (
                      <CheckCircle2 className="h-8 w-8 text-primary fill-primary/10" />
                    ) : (
                      <Circle className="h-8 w-8 text-muted-foreground" />
                    )}
                  </button>
                  <div>
                    <h3 className={cn(
                      "font-bold text-lg",
                      bill.isPaid && "line-through text-muted-foreground"
                    )}>
                      {bill.name}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Due on {bill.dueDate}{bill.dueDate === 1 ? 'st' : bill.dueDate === 2 ? 'nd' : bill.dueDate === 3 ? 'rd' : 'th'}
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        ${bill.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {!bill.isPaid && bill.dueDate <= today + 3 && (
                    <Badge variant="destructive" className="rounded-lg px-2 py-1 text-[10px] font-bold animate-pulse">
                      DUE SOON
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
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
              <Label htmlFor="amount" className="text-sm font-semibold">Monthly Amount ($)</Label>
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
            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                {isSubmitting ? 'Saving...' : 'Save Bill'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
