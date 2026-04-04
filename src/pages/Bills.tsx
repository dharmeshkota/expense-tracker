import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialogue";

export default function Bills() {
  const [bills, setBills] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchBills = async () => {
    const res = await fetch('/api/bills');
    if (res.ok) {
      const data = await res.json();
      setBills(data);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const togglePaid = async (id: string, currentStatus: boolean) => {
    const res = await fetch(`/api/bills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPaid: !currentStatus }),
    });

    if (res.ok) {
      toast.success(currentStatus ? 'Marked as unpaid' : 'Bill paid!');
      fetchBills();
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Bill deleted successfully');
        fetchBills();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete bill');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the bill');
    }
  };

  const handleAddBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      amount: formData.get('amount'),
      dueDate: formData.get('dueDate'),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    };

    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success('Bill added successfully');
      setIsAddOpen(false);
      fetchBills();
    }
  };

  const today = new Date().getDate();
  const unpaidUpcoming = bills.filter(b => !b.isPaid && b.dueDate >= 1 && b.dueDate <= 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Bills</h1>
          <p className="text-muted-foreground">Manage your monthly commitments.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <Button onClick={() => setIsAddOpen(true)} className="rounded-full h-12 px-6 gap-2 shadow-lg">
            <Plus className="h-5 w-5" />
            Add Bill
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Recurring Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBill} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bill Name</Label>
                <Input id="name" name="name" placeholder="Rent, Electricity, etc." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monthly Amount (₹)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Day of Month)</Label>
                <Input id="dueDate" name="dueDate" type="number" min="1" max="31" required />
              </div>
              <Button type="submit" className="w-full">Save Bill</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {unpaidUpcoming.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="flex flex-row items-center space-x-2 pb-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You have {unpaidUpcoming.length} bill(s) due between the 1st and 5th of the month that are still unpaid.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {bills.map((bill) => (
          <Card key={bill.id} className={bill.isPaid ? 'opacity-60' : ''}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => togglePaid(bill.id, bill.isPaid)}
                  className="transition-transform hover:scale-110"
                >
                  {bill.isPaid ? (
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  ) : (
                    <Circle className="h-8 w-8 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <h3 className={bill.isPaid ? 'line-through font-medium' : 'font-bold text-lg'}>
                    {bill.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      DUE DAY: {bill.dueDate}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ₹{bill.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!bill.isPaid && bill.dueDate <= today + 3 && (
                  <Badge variant="destructive" className="animate-pulse">
                    DUE SOON
                  </Badge>
                )}
                <AlertDialog>
                  <AlertDialogTrigger 
                    render={
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                      />
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the recurring bill.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteBill(bill.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {bills.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No recurring bills added yet.
          </div>
        )}
      </div>
    </div>
  );
}
