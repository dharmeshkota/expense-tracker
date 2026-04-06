import { useState } from 'react';
import { useStore, Category } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Tag, Check, X, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { categories, addCategory, removeCategory, updateCategory } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      icon: 'Tag',
      color: newColor,
    };
    
    addCategory(newCat);
    toast.success('Category added successfully');
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    setIsAddOpen(false);
  };

  const handleUpdate = () => {
    if (!editingCategory || !newName.trim()) return;
    
    updateCategory({
      ...editingCategory,
      name: newName.trim(),
      color: newColor,
    });
    
    toast.success('Category updated');
    setEditingCategory(null);
    setNewName('');
  };

  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    setNewName(cat.name);
    setNewColor(cat.color);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              Customize how you organize your spending for better tracking.
            </p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <Button 
              onClick={() => setIsAddOpen(true)} 
              className="rounded-xl h-11 px-6 gap-2 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Category</span>
            </Button>
            <DialogContent className="rounded-2xl sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Category Name</Label>
                  <Input 
                    placeholder="e.g. Groceries, Rent, etc." 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl bg-muted/50 border-none h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    Pick a Color
                  </Label>
                  <div className="grid grid-cols-5 gap-3">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={cn(
                          "h-10 w-10 rounded-xl transition-all duration-200 flex items-center justify-center",
                          newColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {newColor === color && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAdd} className="rounded-xl px-8 shadow-lg shadow-primary/20">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Card key={cat.id} className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Tag className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Category</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Dialog open={editingCategory?.id === cat.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(cat)} className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <DialogContent className="rounded-2xl sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Category Name</Label>
                          <Input 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="rounded-xl bg-muted/50 border-none h-11"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            Update Color
                          </Label>
                          <div className="grid grid-cols-5 gap-3">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => setNewColor(color)}
                                className={cn(
                                  "h-10 w-10 rounded-xl transition-all duration-200 flex items-center justify-center",
                                  newColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                              >
                                {newColor === color && <Check className="h-4 w-4 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingCategory(null)} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleUpdate} className="rounded-xl px-8 shadow-lg shadow-primary/20">Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeCategory(cat.id)}
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
