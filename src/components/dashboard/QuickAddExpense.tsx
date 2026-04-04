import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const expenseSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const categories = [
  'Rent', 'Electricity', 'Transportation', 'Outings', 'Groceries', 
  'Family', 'Shopping', 'Travel', 'Custom'
];

interface QuickAddExpenseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickAddExpense({ isOpen, onClose, onSuccess }: QuickAddExpenseProps) {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input 
              id="amount" 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              {...register('amount')} 
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={(val) => setValue('category', val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input id="description" placeholder="Lunch, Uber, etc." {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
