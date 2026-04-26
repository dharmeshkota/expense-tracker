import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, UserPlus, Receipt, Search, Mail, Loader2, Calendar, Tag, Trash2, MoreVertical, LogOut, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DEFAULT_GROUP_CATEGORIES = [
    { name: "Rent", icon: "Tag", color: "#ff4757" },
    { name: "Food", icon: "Tag", color: "#2ed573" },
    { name: "Transport", icon: "Tag", color: "#ff6b2b" },
    { name: "Bills", icon: "Tag", color: "#00c2e0" },
    { name: "Essentials", icon: "Tag", color: "#facc15" },
    { name: "Grocery", icon: "Tag", color: "#f43f8e" },
    { name: "Others", icon: "Tag", color: "#504e4e" },
    { name: "Entertainment", icon: "Tag", color: "#a855f7" }
];

export default function Groups() {
  const { user, categories, settings } = useStore();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  
  const [memberEmail, setMemberEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [splitAmount, setSplitAmount] = useState('');
  const [splitDesc, setSplitDesc] = useState('');
  const [splitCategory, setSplitCategory] = useState('');
  const [splitDate, setSplitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Queries
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await fetch('/api/groups');
      if (!res.ok) throw new Error('Failed to fetch groups');
      return res.json();
    }
  });

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create group');
      return res.json();
    },
    onMutate: () => {
      setIsCreateOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      return data;
    },
    onMutate: () => {
      setIsAddMemberOpen(false);
      setMemberEmail('');
      setSearchResults([]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Member added!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const splitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/groups/${selectedGroup.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to split payment');
      return res.json();
    },
    onMutate: () => {
      setIsSplitOpen(false);
    },
    onSuccess: () => {
      toast.success('Payment split successfully!');
      setSplitAmount('');
      setSplitDesc('');
      setSplitCategory('');
      setSelectedMembers([]);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string, userId: string }) => {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to leave group');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Left group');
    },
    onError: (error) => {
       toast.error(error.message);
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete group');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group deleted');
    },
    onError: (error) => {
       toast.error(error.message);
    }
  });

  const searchUsers = async (email: string) => {
    if (email.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?email=${email}`);
      if (res.ok) setSearchResults(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const groupCategories = useMemo(() => {
    const userCats = categories.filter(c => c.type === 'expense');
    const existingNames = new Set(userCats.map(c => c.name));
    const defaults = DEFAULT_GROUP_CATEGORIES.filter(c => !existingNames.has(c.name));
    return [...userCats, ...defaults];
  }, [categories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-6 md:p-8 border border-primary/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Collaborative Splitting</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Split Groups</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md">
              Create groups, invite friends, and split expenses instantly like GPay.
            </p>
          </div>
          
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            disabled={createGroupMutation.isPending}
            className="rounded-xl h-11 px-6 gap-2 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-105 active:scale-95"
          >
            {createGroupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Create Group</span>
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent className="rounded-2xl sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">Create a Group</DialogTitle>
                <DialogDescription>Add a name and optional description for your new split group.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1">Group Name</label>
                  <Input 
                    value={newGroupName} 
                    onChange={(e) => setNewGroupName(e.target.value)} 
                    placeholder="e.g. Roommates, Trip to Bali" 
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1">Description</label>
                  <Input 
                    value={newGroupDesc} 
                    onChange={(e) => setNewGroupDesc(e.target.value)} 
                    placeholder="Brief description" 
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createGroupMutation.mutate({ name: newGroupName, description: newGroupDesc })} 
                  disabled={!newGroupName || createGroupMutation.isPending}
                  className="w-full rounded-xl h-11 font-bold"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group: any) => (
          <Card key={group.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:scale-[1.01] transition-all duration-300 border border-transparent hover:border-primary/20 flex flex-col">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 3).map((m: any) => (
                      <div key={m.id} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                        {m.user.image ? (
                          <img src={m.user.image} alt={m.user.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold">{m.user.name?.[0] || m.user.email[0].toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                    {group.members.length > 3 && (
                      <div className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                        +{group.members.length - 3}
                      </div>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/80">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48">
                      <DropdownMenuItem 
                        className="text-xs font-bold gap-2 py-2.5 cursor-pointer rounded-lg"
                        onClick={() => { setSelectedGroup(group); setIsAddMemberOpen(true); }}
                      >
                        <UserPlus className="h-4 w-4" />
                        Invite Friends
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {group.ownerId === user?.id ? (
                        <DropdownMenuItem 
                          className="text-xs font-bold gap-2 py-2.5 cursor-pointer rounded-lg text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm('Delete this group? All shared expenses history will remain, but group collaboration will end.')) {
                              deleteGroupMutation.mutate(group.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Group
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="text-xs font-bold gap-2 py-2.5 cursor-pointer rounded-lg text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm('Leave this group?')) {
                              leaveGroupMutation.mutate({ groupId: group.id, userId: user?.id || '' });
                            }
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Leave Group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardTitle className="mt-4 font-black text-xl">{group.name}</CardTitle>
              <CardDescription className="line-clamp-1">{group.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-8 space-y-6 flex-grow flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {group.members.length} Members</span>
                <span>{group.ownerId === user?.id ? 'Owned by You' : `By ${group.owner.name || 'Admin'}`}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => { setSelectedGroup(group); setIsAddMemberOpen(true); }}
                  variant="outline" size="sm" className="flex-1 rounded-xl h-10 gap-2 font-bold border-none bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite
                </Button>
                <Button 
                  onClick={() => { 
                    setSelectedGroup(group); 
                    setIsSplitOpen(true);
                    setSelectedMembers(group.members.map((m: any) => m.userId));
                  }}
                  size="sm" className="flex-1 rounded-xl h-10 gap-2 font-bold shadow-md shadow-primary/20"
                >
                  <Receipt className="h-4 w-4" />
                  Split
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
            <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">No groups yet</h3>
              <p className="text-muted-foreground">Create a group to start splitting bills with friends.</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Invite Member</DialogTitle>
            <DialogDescription>Search for users by email to add them to {selectedGroup?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                value={memberEmail}
                onChange={(e) => {
                  setMemberEmail(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="friend@example.com"
                className="pl-10 rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 group hover:bg-primary/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                        {u.name?.[0] || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-none">{u.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => addMemberMutation.mutate({ groupId: selectedGroup.id, userId: u.id })} 
                      disabled={addMemberMutation.isPending}
                      size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white"
                    >
                      {addMemberMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                ))
              ) : memberEmail.length >= 3 && (
                <p className="text-xs text-center text-muted-foreground py-4">No users found with that email.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Payment Dialog */}
      <Dialog open={isSplitOpen} onOpenChange={setIsSplitOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Split Expense</DialogTitle>
            <DialogDescription>Split an amount among {selectedMembers.length} group members.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold ml-1 block mb-1">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">{settings.currency === 'USD' ? '$' : '₹'}</span>
                  <Input 
                    type="number"
                    value={splitAmount} 
                    onChange={(e) => setSplitAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="pl-8 rounded-xl h-12 font-bold border-muted bg-muted/20 focus:bg-background transition-all"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold ml-1 block mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    value={splitDate} 
                    onChange={(e) => setSplitDate(e.target.value)} 
                    className="pl-10 rounded-xl h-12 border-muted bg-muted/20 focus:bg-background transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold ml-1 block mb-1">Split Description</label>
              <Input 
                value={splitDesc} 
                onChange={(e) => setSplitDesc(e.target.value)} 
                placeholder="e.g. Dinner, Movie tickets" 
                className="rounded-xl h-12 border-muted bg-muted/20 focus:bg-background transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold ml-1 block mb-1">Category</label>
              <Select value={splitCategory} onValueChange={setSplitCategory}>
                <SelectTrigger className="rounded-xl h-12 border-muted bg-muted/20 focus:bg-background transition-all">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="Select category" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {groupCategories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name} className="rounded-lg">
                      <div className="flex items-center gap-2 py-0.5">
                        <Tag className="h-3 w-3" style={{ color: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Members to Split With</label>
                <span className="text-[10px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  {formatCurrency(parseFloat(splitAmount || '0') / (selectedMembers.length || 1), settings.currency)} each
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1">
                {selectedGroup?.members.map((m: any) => (
                  <button
                    key={m.userId}
                    onClick={() => {
                      if (selectedMembers.includes(m.userId)) {
                        setSelectedMembers(selectedMembers.filter(id => id !== m.userId));
                      } else {
                        setSelectedMembers([...selectedMembers, m.userId]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                      selectedMembers.includes(m.userId)
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/10 border-transparent text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-6 w-6 rounded-lg flex items-center justify-center font-bold text-[10px]",
                      selectedMembers.includes(m.userId) ? "bg-primary text-white" : "bg-muted"
                    )}>
                      {m.user.name?.[0] || m.user.email[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold truncate">{m.user.name || m.user.email.split('@')[0]}</span>
                    {selectedMembers.includes(m.userId) && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
               onClick={() => splitMutation.mutate({
                 amount: splitAmount,
                 description: splitDesc,
                 category: splitCategory,
                 date: splitDate,
                 memberIds: selectedMembers
               })} 
               disabled={!splitAmount || !splitDesc || !splitCategory || selectedMembers.length === 0 || splitMutation.isPending}
               className="w-full rounded-xl h-11 font-bold shadow-lg shadow-primary/20"
            >
              {splitMutation.isPending ? 'Splitting...' : 'Split Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
