import { useState, useEffect } from 'react';
import { useStore, Category } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Tag, Check, X, Palette, ShieldAlert, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRESET_COLORS = [
  '#ff4757', // vivid red
  '#ff6b2b', // electric orange
  '#ffa502', // amber
  '#2ed573', // neon green
  '#1e90ff', // dodger blue
  '#a855f7', // violet
  '#f43f8e', // hot pink
  '#00c2e0', // electric cyan
  '#00e096', // mint
  '#facc15', // golden yellow
];

export default function Categories() {
  const { categories, setCategories, addCategory, removeCategory, updateCategory } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: PRESET_COLORS[0],
    icon: 'Tag',
    type: 'expense' as 'expense' | 'income' | 'both',
    excludeFromBudget: false
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    // Close immediately
    setIsAddOpen(false);
    const categoryToSave = { ...newCategory };
    setNewCategory({ name: '', color: PRESET_COLORS[0], icon: 'Tag', type: 'expense', excludeFromBudget: false });

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryToSave),
      });
      
      if (res.ok) {
        const data = await res.json();
        addCategory(data);
        toast.success('Category added successfully');
      } else {
        toast.error('Failed to add category');
      }
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    
    const categoryToUpdate = { ...editingCategory };
    setEditingCategory(null);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryToUpdate),
      });
      
      if (res.ok) {
        updateCategory(categoryToUpdate);
        toast.success('Category updated');
      } else {
        toast.error('Failed to update category');
      }
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? Removing a category will label related transactions as "Uncategorized".')) return;
    
    // Optimistic UI
    const oldCategories = [...categories];
    removeCategory(id);

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category removed');
      } else {
        setCategories(oldCategories);
        toast.error('Failed to remove category');
      }
    } catch (error) {
      setCategories(oldCategories);
      toast.error('Failed to remove category');
    }
  };

  const seedDefaults = async () => {
    const defaults = [
      { name: "Rent", icon: "Tag", color: "#ff4757", excludeFromBudget: false, type: "expense" },
      { name: "Food", icon: "Tag", color: "#2ed573", excludeFromBudget: false, type: "expense" },
      { name: "Transport", icon: "Tag", color: "#ff6b2b", excludeFromBudget: false, type: "expense" },
      { name: "Bills", icon: "Tag", color: "#00c2e0", excludeFromBudget: false, type: "expense" },
      { name: "Essentials", icon: "Tag", color: "#facc15", excludeFromBudget: false, type: "expense" },
      { name: "Grocery", icon: "Tag", color: "#f43f8e", excludeFromBudget: false, type: "expense" },
      { name: "Others", icon: "Tag", color: "#504e4e", excludeFromBudget: false, type: "expense" },
      { name: "Entertainment", icon: "Tag", color: "#a855f7", excludeFromBudget: false, type: "expense" }
    ];

    const toastId = toast.loading('Restoring categories...');
    try {
      await Promise.all(defaults.map(cat => 
        fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cat),
        })
      ));
      toast.dismiss(toastId);
      toast.success('Categories restored!');
      fetchCategories();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Failed to restore categories');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-6 md:p-8 border border-primary/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Tag className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Organization</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Categories</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md">
              Customize how you organize your spending for better tracking and budget management.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="outline"
              onClick={seedDefaults} 
              className="rounded-xl h-11 px-6 gap-2 font-bold border-muted-foreground/20 hover:bg-muted"
            >
              <Check className="h-4 w-4" />
              <span>Restore Defaults</span>
            </Button>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <Button 
                onClick={() => setIsAddOpen(true)} 
                className="rounded-xl h-11 px-6 gap-2 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>New Category</span>
              </Button>
              <DialogContent className="rounded-2xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Category Name</Label>
                  <Input 
                    placeholder="e.g. Groceries, Rent, etc." 
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="rounded-xl bg-muted/50 border-none h-11 font-bold"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    Pick a Color
                  </Label>
                  <div className="grid grid-cols-5 gap-3">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCategory({...newCategory, color})}
                        className={cn(
                          "h-10 w-10 rounded-xl transition-all duration-200 flex items-center justify-center",
                          newCategory.color === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {newCategory.color === color && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Type</Label>
                    <Select value={newCategory.type} onValueChange={(v: any) => setNewCategory({...newCategory, type: v})}>
                      <SelectTrigger className="rounded-xl h-11 bg-muted/50 border-none font-bold">
                        <SelectValue>
                          {newCategory.type.charAt(0).toUpperCase() + newCategory.type.slice(1)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Custom Color</Label>
                    <Input 
                      type="color" 
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                      className="h-11 p-1 rounded-xl cursor-pointer bg-muted/50 border-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Exclude from Budget</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Transactions won't count towards monthly budget.</p>
                  </div>
                  <Switch 
                    checked={newCategory.excludeFromBudget}
                    onCheckedChange={(v) => setNewCategory({...newCategory, excludeFromBudget: v})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAdd} className="rounded-xl px-8 shadow-lg shadow-primary/20 font-bold">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>
    </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : categories.map((cat, index) => (
          <Card key={`${cat.id}-${index}`} className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.type === 'income' ? <TrendingUp className="h-6 w-6" /> : <Tag className="h-6 w-6" />}
                  </div>
                  <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{cat.name}</h3>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                          cat.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : 
                          cat.type === 'both' ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                        )}>
                          {cat.type ? cat.type.charAt(0).toUpperCase() + cat.type.slice(1) : 'Expense'}
                        </span>
                      </div>
                    <div className="flex items-center gap-2 mt-1">
                      {cat.excludeFromBudget && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                          <ShieldAlert className="h-3 w-3" />
                          Excluded from Budget
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Dialog open={editingCategory?.id === cat.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                    <Button variant="ghost" size="icon" onClick={() => setEditingCategory(cat)} className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <DialogContent className="rounded-2xl sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-bold">Category Name</Label>
                          <Input 
                            value={editingCategory?.name}
                            onChange={(e) => setEditingCategory(editingCategory ? {...editingCategory, name: e.target.value} : null)}
                            className="rounded-xl bg-muted/50 border-none h-11 font-bold"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            <Palette className="h-4 w-4 text-primary" />
                            Update Color
                          </Label>
                          <div className="grid grid-cols-5 gap-3">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditingCategory(editingCategory ? {...editingCategory, color} : null)}
                                className={cn(
                                  "h-10 w-10 rounded-xl transition-all duration-200 flex items-center justify-center",
                                  editingCategory?.color === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                              >
                                {editingCategory?.color === color && <Check className="h-4 w-4 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold">Type</Label>
                            <Select 
                              value={editingCategory?.type || 'expense'} 
                              onValueChange={(v: any) => setEditingCategory(editingCategory ? {...editingCategory, type: v} : null)}
                            >
                              <SelectTrigger className="rounded-xl h-11 bg-muted/50 border-none font-bold">
                                <SelectValue placeholder="Select type">
                                  {editingCategory?.type ? editingCategory.type.charAt(0).toUpperCase() + editingCategory.type.slice(1) : 'Expense'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-bold">Custom Color</Label>
                            <Input 
                              type="color" 
                              value={editingCategory?.color}
                              onChange={(e) => setEditingCategory(editingCategory ? {...editingCategory, color: e.target.value} : null)}
                              className="h-11 p-1 rounded-xl cursor-pointer bg-muted/50 border-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Exclude from Budget</Label>
                            <p className="text-[10px] text-muted-foreground font-medium">Transactions won't count towards monthly budget.</p>
                          </div>
                          <Switch 
                            checked={!!editingCategory?.excludeFromBudget}
                            onCheckedChange={(v) => setEditingCategory(editingCategory ? {...editingCategory, excludeFromBudget: v} : null)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingCategory(null)} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleUpdate} className="rounded-xl px-8 shadow-lg shadow-primary/20 font-bold">Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(cat.id)}
                    className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
