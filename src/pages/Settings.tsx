import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { LogOut, Save, User, Wallet, Moon, Sun } from 'lucide-react';

export default function Settings() {
  const { user } = useStore();
  const [salary, setSalary] = useState('');
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const fetchBudget = async () => {
    const now = new Date();
    const res = await fetch(`/api/budget?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    if (res.ok) {
      const data = await res.json();
      if (data) setSalary(data.totalSalary.toString());
    }
  };

  useEffect(() => {
    fetchBudget();
  }, []);

  const handleSaveBudget = async () => {
    const now = new Date();
    const res = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalSalary: salary,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      }),
    });

    if (res.ok) {
      toast.success('Budget updated successfully!');
    } else {
      toast.error('Failed to update budget');
    }
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences.</p>
      </header>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your personal account details.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.image} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{user?.name}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Monthly Budget
            </CardTitle>
            <CardDescription>Set your total salary for the current month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Total Salary ($)</Label>
              <Input 
                id="salary" 
                type="number" 
                value={salary} 
                onChange={(e) => setSalary(e.target.value)} 
                placeholder="0.00"
              />
            </div>
            <Button onClick={handleSaveBudget} className="gap-2">
              <Save className="h-4 w-4" />
              Save Budget
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>Switch between light and dark mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={toggleTheme} className="gap-2">
              {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout from ExpensePro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
