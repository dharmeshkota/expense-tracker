import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { LogOut, Save, User, Wallet, Moon, Sun, Smartphone, Globe, Palette, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
} from "@/components/ui/alert-dialog";

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export default function Settings() {
  const { user, settings, updateSettings, setExpenses, setBills } = useStore();
  const [salary, setSalary] = useState(settings.monthlySalary.toString());
  const [budget, setBudget] = useState(settings.monthlyBudget.toString());

  const handleSaveFinancials = () => {
    updateSettings({
      monthlySalary: parseFloat(salary),
      monthlyBudget: parseFloat(budget),
    });
    toast.success('Financial settings updated!');
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
  };

  const handleResetData = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        setExpenses([]);
        setBills([]);
        toast.success('All data has been reset!');
      } else {
        toast.error('Failed to reset data');
      }
    } catch (error) {
      toast.error('An error occurred during reset');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, budget, and application preferences.</p>
      </header>

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Profile Information</CardTitle>
                <CardDescription>Your personal account details from Google.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            <Avatar className="h-24 w-24 border-4 border-muted shadow-inner">
              <AvatarImage src={user?.image} />
              <AvatarFallback className="text-2xl font-bold bg-primary/5 text-primary">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-2xl font-bold">{user?.name}</h3>
              <p className="text-muted-foreground font-medium">{user?.email}</p>
              <div className="pt-2">
                <Badge variant="secondary" className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Google Account Connected
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Financial Configuration</CardTitle>
                <CardDescription>Set your monthly income and spending targets.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-sm font-semibold">Monthly Income</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <Input 
                    id="salary" 
                    type="number" 
                    value={salary} 
                    onChange={(e) => setSalary(e.target.value)} 
                    className="pl-8 rounded-xl bg-muted/50 border-none h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-sm font-semibold">Monthly Spending Budget</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <Input 
                    id="budget" 
                    type="number" 
                    value={budget} 
                    onChange={(e) => setBudget(e.target.value)} 
                    className="pl-8 rounded-xl bg-muted/50 border-none h-11"
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleSaveFinancials} className="rounded-xl px-6 gap-2 shadow-lg shadow-primary/20">
              <Save className="h-4 w-4" />
              Save Financials
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Palette className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">App Preferences</CardTitle>
                <CardDescription>Customize your experience and localization.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Currency Display
                </Label>
                <Select 
                  value={settings.currency} 
                  onValueChange={(val) => updateSettings({ currency: val })}
                >
                  <SelectTrigger className="rounded-xl bg-muted/50 border-none h-11">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-bold mr-2">{c.symbol}</span>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  Theme Mode
                </Label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-xl">
                  {[
                    { id: 'light', icon: Sun, label: 'Light' },
                    { id: 'dark', icon: Moon, label: 'Dark' },
                    { id: 'system', icon: Smartphone, label: 'System' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateSettings({ theme: t.id as any })}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg transition-all",
                        settings.theme === t.id 
                          ? "bg-background shadow-sm text-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <t.icon className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            <CardDescription>Actions that cannot be undone. Please be careful.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={handleLogout} className="rounded-xl px-6 gap-2 border-destructive/20 hover:bg-destructive/10 text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>

            <AlertDialog>
              <AlertDialogTrigger>
                <Button variant="destructive" className="rounded-xl px-6 gap-2">
                  <Trash2 className="h-4 w-4" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all your expenses, bills, and budget settings. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetData} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: 'secondary', className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variant === 'secondary' ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80" : "",
      className
    )}>
      {children}
    </span>
  );
}
