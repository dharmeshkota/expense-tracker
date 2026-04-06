import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';

const expenseSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface QuickAddExpenseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickAddExpense({ isOpen, onClose, onSuccess }: QuickAddExpenseProps) {
  const { categories, addExpense, settings } = useStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newExpense = await res.json();
        addExpense(newExpense);
        toast.success('Expense added successfully!');
        reset();
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to add expense');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-semibold">Amount ({settings.currency})</Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                className="rounded-xl bg-card border border-border shadow-sm h-11 focus:bg-background transition-all"
                {...register('amount')} 
              />
              {errors.amount && <p className="text-xs text-destructive font-medium">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
              <Select onValueChange={(val: string) => setValue('category', val)}>
                <SelectTrigger className="rounded-xl bg-card border border-border shadow-sm h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive font-medium">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Input 
                id="description" 
                placeholder="What did you spend on?" 
                className="rounded-xl bg-card border border-border shadow-sm h-11 focus:bg-background transition-all"
                {...register('description')} 
              />
              {errors.description && <p className="text-xs text-destructive font-medium">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold">Date</Label>
              <Input 
                id="date" 
                type="date" 
                className="rounded-xl bg-card border border-border shadow-sm h-11 focus:bg-background transition-all"
                {...register('date')} 
              />
              {errors.date && <p className="text-xs text-destructive font-medium">{errors.date.message}</p>}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8 shadow-lg shadow-primary/20">
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
