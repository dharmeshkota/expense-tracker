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
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { encryptData } from '@/lib/encryption';

const expenseSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(['expense', 'income']),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface QuickAddExpenseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickAddExpense({ isOpen, onClose, onSuccess }: QuickAddExpenseProps) {
  const { categories, addExpense, settings, vaultKey } = useStore();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
    }
  });

  const type = watch('type');

  const addExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      // If vault key is active, we encrypt the entire content into the description field
      // and set a dummy amount in the DB (0) to ensure the owner sees nothing.
      let payload: any = {
        category: data.category,
        date: new Date(data.date),
        type: data.type,
      };

      if (settings.useVault && vaultKey) {
        const sensitiveData = {
          amount: parseFloat(data.amount),
          description: data.description,
          isEncryptedViaVault: true,
        };
        
        payload.description = encryptData(JSON.stringify(sensitiveData), vaultKey);
        payload.amount = 0; // The real amount is inside the encrypted description
      } else {
        payload.description = data.description;
        payload.amount = parseFloat(data.amount);
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to add transaction');
      return res.json();
    },
    onSuccess: (newExpense, variables) => {
      addExpense(newExpense);
      toast.success(`${variables.type === 'income' ? 'Income' : 'Expense'} added successfully!`);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      reset();
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: () => {
      toast.error('An error occurred');
    }
  });

  const onSubmit = (data: ExpenseFormValues) => {
    addExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6 py-4">
            <div className="flex p-1 bg-muted rounded-xl">
              <button
                type="button"
                onClick={() => setValue('type', 'expense')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  type === 'expense' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setValue('type', 'income')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  type === 'income' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Income
              </button>
            </div>

            <div className="space-y-3">
              <Label htmlFor="amount" className="text-sm font-semibold ml-1 block mb-1">Amount ({settings.currency})</Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                className="rounded-xl bg-muted/20 border-muted shadow-sm h-12 focus:bg-background transition-all"
                {...register('amount')} 
              />
              {errors.amount && <p className="text-xs text-destructive font-medium">{errors.amount.message}</p>}
            </div>

            <div className="space-y-3">
              <Label htmlFor="category" className="text-sm font-semibold ml-1 block mb-1">Category</Label>
              <Select onValueChange={(val: string) => setValue('category', val)}>
                <SelectTrigger className="rounded-xl bg-muted/20 border-muted shadow-sm h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories
                    .filter(cat => {
                      if (type === 'income') return cat.type === 'income' || cat.type === 'both';
                      return cat.type === 'expense' || cat.type === 'both' || !cat.type;
                    })
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.name} className="rounded-lg">
                        <div className="flex items-center gap-2 py-0.5">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {type === 'income' && categories.filter(c => c.type === 'income').length === 0 && (
                    <SelectItem value="Income" className="rounded-lg">
                      <div className="flex items-center gap-2 py-0.5">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span>Income</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive font-medium">{errors.category.message}</p>}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold ml-1 block mb-1">Description</Label>
              <Input 
                id="description" 
                placeholder={type === 'income' ? "Where did this money come from?" : "What did you spend on?"}
                className="rounded-xl bg-muted/20 border-muted shadow-sm h-12 focus:bg-background transition-all"
                {...register('description')} 
              />
              {errors.description && <p className="text-xs text-destructive font-medium">{errors.description.message}</p>}
            </div>

            <div className="space-y-3">
              <Label htmlFor="date" className="text-sm font-semibold ml-1 block mb-1">Date</Label>
              <Input 
                id="date" 
                type="date" 
                className="rounded-xl bg-muted/20 border-muted shadow-sm h-12 focus:bg-background transition-all"
                {...register('date')} 
              />
              {errors.date && <p className="text-xs text-destructive font-medium">{errors.date.message}</p>}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-12">Cancel</Button>
            <Button type="submit" disabled={addExpenseMutation.isPending} className="rounded-xl px-8 shadow-lg shadow-primary/20 h-12 font-bold min-w-[120px]">
              {addExpenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
