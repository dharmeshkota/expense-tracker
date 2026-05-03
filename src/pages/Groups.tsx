import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, UserPlus, Receipt, Search, Mail, Loader2, Calendar, Tag, Trash2, MoreVertical, LogOut, Settings2, ChevronLeft, History, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { encryptData, decryptData, isEncrypted } from '@/lib/encryption';
import { VaultGuard } from '@/components/VaultGuard';

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
  const { user, categories, settings, vaultKey } = useStore();
  const queryClient = useQueryClient();
  
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
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

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  const { isLoading: isActivityLoading, isFetching } = useQuery({
    queryKey: ['groupActivity', activeGroupId, page, vaultKey, settings.useVault],
    queryFn: async () => {
      if (!activeGroupId) return null;
      const res = await fetch(`/api/groups/${activeGroupId}/activity?page=${page}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      
      // Decrypt activities ONLY if vault is enabled
      const decryptedActivities = data.activities.map((a: any) => {
        const cleanDescription = a.description.replace(' (Split)', '');
        if (vaultKey && isEncrypted(cleanDescription)) {
          // Try personal vault key first
          let decrypted = decryptData(cleanDescription, vaultKey as string);
          
          // Fallback to group key if personal key fails (for shared splits)
          if (!decrypted && activeGroupId) {
            decrypted = decryptData(cleanDescription, activeGroupId);
          }

          if (decrypted && typeof decrypted === 'object' && decrypted.isEncryptedViaVault) {
            return {
              ...a,
              amount: decrypted.amount,
              description: decrypted.description + (a.description.includes(' (Split)') ? ' (Split)' : ''),
              isActuallyEncrypted: true
            };
          }
        }
        return a;
      });

      if (page === 1) {
        setActivities(decryptedActivities);
      } else {
        setActivities(prev => [...prev, ...decryptedActivities]);
      }
      setHasMore(data.pagination.currentPage < data.pagination.pages);
      return { ...data, activities: decryptedActivities };
    },
    enabled: !!activeGroupId && (!settings.useVault || !!vaultKey)
  });

  const groupedActivity = useMemo(() => {
    const groups: any[] = [];
    activities.forEach((item: any) => {
      const dateKey = format(new Date(item.date), 'yyyy-MM-dd-HH-mm');
      // Group by date and prefix of description (to handle " (Split)" suffix)
      const descKey = item.description.replace(' (Split)', '');
      const existing = groups.find(g => 
        format(new Date(g.date), 'yyyy-MM-dd-HH-mm') === dateKey && 
        g.description.replace(' (Split)', '') === descKey
      );

      if (existing) {
        existing.amount += item.amount;
        if (!existing.members) existing.members = [existing.user];
        if (!existing.members.find((m: any) => m.id === item.user.id)) {
          existing.members.push(item.user);
        }
        // Use creator info if available
        if (item.creator) {
          existing.creator = item.creator;
        }
      } else {
        groups.push({ ...item, members: [item.user] });
      }
    });
    return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending order (newest at top)
  }, [activities]);

  useEffect(() => {
    setPage(1);
    setActivities([]);
  }, [activeGroupId]);


  const scrollRef = useRef<HTMLDivElement>(null);

  // Removed scroll-to-bottom since newest is at top

  const activeGroup = useMemo(() => {
    return groups.find((g: any) => g.id === activeGroupId);
  }, [groups, activeGroupId]);

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
      // Ensure the date includes the current time if it's today
      const today = format(new Date(), 'yyyy-MM-dd');
      let finalDate = data.date;
      if (data.date === today) {
        finalDate = new Date().toISOString();
      } else {
        // If it's a specific date, set to noon of that date to avoid midnight/timezone issues
        finalDate = new Date(`${data.date}T12:00:00`).toISOString();
      }

      const payload = { ...data };
      if (settings.useVault && vaultKey) {
        const splitCount = data.memberIds.length || 1;
        const totalAmount = parseFloat(data.amount);
        const individualAmount = totalAmount / splitCount;
        
        const sensitiveData = {
          amount: individualAmount, // Encrypt the individual share, not the total
          description: data.description,
          isEncryptedViaVault: true
        };
        // Use activeGroupId as the key for shared splits so all members can decrypt it
        payload.description = encryptData(JSON.stringify(sensitiveData), activeGroupId as string);
        payload.amount = 0; // Server sees nothing
      }

      const res = await fetch(`/api/groups/${selectedGroup.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...payload, 
          date: finalDate,
          isEncrypted: !!(settings.useVault && vaultKey) 
        })
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
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['groupActivity', activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteSplitMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      // Find the activity item to get all related splits (same desc and date)
      const item = activities.find(a => a.id === expenseId);
      if (!item) return;

      const res = await fetch(`/api/groups/${activeGroupId}/split/${expenseId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete split');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Split deleted');
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['groupActivity', activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
    <VaultGuard>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto pb-10">
      {activeGroupId && activeGroup ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 w-full">
          {/* Group Detail Header */}
          <div className="lg:bg-card lg:backdrop-blur-sm lg:border lg:border-border/60 lg:rounded-[2.5rem] lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between lg:shadow-xl lg:shadow-primary/5 relative overflow-hidden">
            {/* Desktop-only background decoration */}
            <div className="hidden lg:block absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-primary/5 rounded-full blur-3xl p-0" />
            
            {/* Mobile Header Bar (Sticky) */}
            <div className="lg:hidden sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setActiveGroupId(null)}
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground font-black text-sm shrink-0">
                    {activeGroup.name.charAt(0)}
                  </div>
                  <h1 className="text-base font-black tracking-tight truncate">{activeGroup.name}</h1>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex -space-x-1.5 mr-1">
                  {activeGroup.members.slice(0, 3).map((m: any) => (
                    <Avatar key={m.userId} className="h-5 w-5 border-2 border-background">
                      {m.user.image ? <AvatarImage src={m.user.image} /> : null}
                      <AvatarFallback className="text-[6px] font-bold bg-muted text-muted-foreground">{m.user.name?.[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-[10px] font-black text-muted-foreground">{activeGroup.members.length}</span>
              </div>
            </div>

            {/* Desktop Identity + Mobile Secondary Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 md:gap-6 relative z-10 w-full lg:flex-1">
              <div className="hidden lg:flex items-center gap-6">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setActiveGroupId(null)}
                  className="rounded-2xl h-12 w-12 hover:bg-primary/5 hover:text-primary transition-all border-border/50 shrink-0 shadow-sm"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-3xl bg-gradient-to-br from-primary to-blue-600 shadow-xl shadow-primary/20 flex items-center justify-center text-primary-foreground font-black text-2xl md:text-3xl transform rotate-3 hover:rotate-0 transition-transform cursor-default shrink-0">
                    {activeGroup.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground truncate">{activeGroup.name}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 shrink-0">
                        {activeGroup.members.slice(0, 5).map((m: any) => (
                          <Avatar key={m.userId} className="h-6 w-6 md:h-7 md:w-7 border-2 border-background shadow-sm">
                            {m.user.image ? <AvatarImage src={m.user.image} /> : null}
                            <AvatarFallback className="text-[8px] md:text-[10px] font-bold bg-muted text-muted-foreground">{m.user.name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-muted-foreground/80 uppercase tracking-widest leading-none">
                        <span className="h-1 w-1 rounded-full bg-primary/40" />
                        {activeGroup.members.length} Members
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-row items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 relative z-10 px-0 lg:px-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedGroup(activeGroup);
                  setIsAddMemberOpen(true);
                }}
                className="flex-1 lg:flex-none rounded-2xl h-14 md:h-12 px-6 gap-3 border-border/40 bg-card/50 backdrop-blur-md shadow-sm font-black text-xs uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
              <Button 
                onClick={() => {
                  setSelectedGroup(activeGroup);
                  setIsSplitOpen(true);
                  setSelectedMembers(activeGroup.members.map((m: any) => m.userId));
                }}
                className="flex-[1.5] lg:flex-none rounded-2xl h-14 md:h-12 px-8 gap-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:translate-y-[-2px] active:scale-95 bg-primary text-primary-foreground"
              >
                <Receipt className="h-4 w-4" />
                Split Bill
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-0.5">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-border/50 shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden bg-card/40 backdrop-blur-sm">
                <CardHeader className="bg-muted/10 p-5 md:p-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2.5">
                      <History className="h-4 w-4 text-primary" />
                      Activity Timeline
                    </CardTitle>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea ref={scrollRef} className="h-[600px]">
                    <div className="p-4 md:p-10 space-y-8 md:space-y-12 relative pb-20">
                      {/* Vertical Timeline Line */}
                      <div className="absolute left-[41px] md:left-[55px] top-12 bottom-20 w-[2px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent pointer-events-none" />

                      {(isActivityLoading || (isFetching && activities.length === 0 && !!activeGroupId)) ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex gap-6 animate-pulse px-2">
                            <div className="h-12 w-12 rounded-2xl bg-muted shrink-0" />
                            <div className="flex-1 space-y-4">
                              <div className="h-4 w-1/3 bg-muted rounded-full" />
                              <div className="h-24 bg-muted rounded-3xl w-full" />
                            </div>
                          </div>
                        ))
                      ) : groupedActivity.length > 0 ? (
                        groupedActivity.map((item: any) => {
                          const isSplit = item.members && item.members.length > 1;
                          const displayUser = item.creator || item.user;
                          const isMe = item.creatorId ? item.creatorId === user?.id : item.user.id === user?.id;
                          
                          // Decrypt data if vault is active and it's encrypted
                          let displayDescription = item.description.replace(' (Split)', '');
                          let displayAmount = item.amount;
  
                          if (vaultKey && isEncrypted(item.description)) {
                            // Try personal vault key first
                            let decrypted = decryptData(item.description, vaultKey as string);
                            
                            // If decryption failed, try group-shared key (derived from groupId)
                            if (!decrypted && activeGroupId) {
                                decrypted = decryptData(item.description, activeGroupId);
                            }

                            if (decrypted && typeof decrypted === 'object' && decrypted.isEncryptedViaVault) {
                              displayDescription = decrypted.description;
                              displayAmount = decrypted.amount;
                            }
                          }

                          return (
                            <div key={item.id} className="flex gap-5 md:gap-8 relative z-10 group/item px-1">
                              {/* Connector Dot */}
                              <div className="absolute left-[39px] md:left-[51px] top-5 h-2.5 w-2.5 rounded-full bg-primary border-[3px] border-background z-20 group-hover/item:scale-125 transition-transform shadow-sm" />
                              
                              <Avatar className="h-12 w-12 md:h-14 md:w-14 rounded-2xl border-2 border-background shadow-lg shrink-0 bg-background transition-all group-hover/item:scale-105 group-hover/item:shadow-primary/10">
                                {displayUser.image ? <AvatarImage src={displayUser.image} /> : null}
                                <AvatarFallback className="font-black text-sm text-primary bg-primary/5">
                                  {displayUser.name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <span className={cn("text-xs md:text-sm font-black tracking-tight", isMe ? "text-primary" : "text-foreground")}>
                                      {isMe ? 'You' : displayUser.name}
                                    </span>
                                    {isSplit && (
                                      <span className="text-[8px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-2.5 py-1 rounded-lg">Group Split</span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-muted-foreground/60 bg-muted/20 px-2 py-1 rounded-lg border border-border/30">
                                    {format(new Date(item.createdAt), 'MMM dd • HH:mm')}
                                  </span>
                                </div>
                                
                                <div className="bg-card border border-border/70 p-5 md:p-6 rounded-[2rem] rounded-tl-none shadow-sm group-hover/item:border-primary/30 transition-all group-hover/item:shadow-md relative">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 relative">
                                      <div className="min-w-0 flex-1 pr-2">
                                      <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-primary/5 rounded-lg shrink-0 border border-primary/10">
                                          <Tag className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.25em] truncate">{item.category}</p>
                                      </div>
                                      <p className="text-base md:text-xl font-bold text-foreground leading-snug break-words mb-5 tracking-tight">
                                        {displayDescription}
                                      </p>
                                      
                                      {isSplit && (
                                        <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-3xl border border-border/40">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="flex -space-x-2 shrink-0">
                                                    {item.members.map((m: any) => (
                                                    <Avatar key={m.id} className="h-7 w-7 md:h-8 md:w-8 border-2 border-background shadow-md shrink-0">
                                                        {m.image ? <AvatarImage src={m.image} /> : null}
                                                        <AvatarFallback className="text-[9px] font-black">{m.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    ))}
                                                </div>
                                                <div className="flex flex-col">
                                                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 leading-none">Participants</span>
                                                  <span className="text-[10px] font-bold text-foreground/60 mt-1">
                                                    {item.members.length} people
                                                  </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2 gap-y-1.5 text-[11px] font-medium text-foreground/70 leading-relaxed max-w-full overflow-hidden">
                                                {item.members.map((m: any, i: number) => (
                                                    <span key={m.id} className="flex items-center gap-1.5 p-0">
                                                        <span className={cn("whitespace-nowrap transition-colors", m.id === user?.id ? "text-primary font-black" : "hover:text-foreground")}>
                                                            {m.id === user?.id ? 'You' : m.name}
                                                        </span>
                                                        {i < item.members.length - 1 && (
                                                            <span className="text-muted-foreground/20">•</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 border-t sm:border-none pt-4 sm:pt-0 mt-2 sm:mt-0">
                                      <div className="bg-primary/5 px-4 py-2.5 rounded-[1.25rem] border border-primary/20 shadow-inner min-w-[110px] sm:min-w-[150px] flex flex-col items-start sm:items-end">
                                        <p className="text-xl md:text-3xl font-black tracking-tighter text-primary whitespace-nowrap">
                                          {formatCurrency(displayAmount, settings.currency)}
                                        </p>
                                        <span className="text-[7px] font-black text-primary/40 uppercase tracking-[0.2em] block mt-1">
                                          {isSplit ? 'Split Total' : 'Personal'}
                                        </span>
                                      </div>
                                      
                                      {isSplit && (
                                        <div className="flex flex-col items-start sm:items-end">
                                          <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">Your Share</span>
                                          <span className="text-sm font-bold text-foreground">
                                            {formatCurrency(activities.find(a => a.description === item.description && a.date === item.date && a.userId === user?.id)?.amount || 0, settings.currency)}
                                          </span>
                                        </div>
                                      )}

                                      {isMe && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-9 rounded-xl text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 text-[8px] font-black uppercase tracking-widest gap-2 px-3 sm:px-4"
                                            onClick={() => {
                                                if (confirm('Delete this split? It will be removed for everyone.')) {
                                                    deleteSplitMutation.mutate(item.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Delete</span>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                          <div className="h-24 w-24 rounded-[2rem] bg-muted/20 flex items-center justify-center rotate-3">
                            <History className="h-10 w-10 text-muted-foreground/20" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-black text-foreground tracking-tight">No activities yet</p>
                            <p className="text-xs text-muted-foreground font-medium px-10">Start by splitting a bill with your group members.</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="rounded-2xl border-dashed border-2 px-8 h-12 hover:border-primary/40 hover:bg-primary/5 transition-all font-bold"
                            onClick={() => {
                              setSelectedGroup(activeGroup);
                              setIsSplitOpen(true);
                              setSelectedMembers(activeGroup.members.map((m: any) => m.userId));
                            }}
                          >
                            Start first split
                          </Button>
                        </div>
                      )}

                      {hasMore && (
                        <div className="flex justify-center pb-10 relative z-10 pt-10">
                          <Button 
                            variant="outline" 
                            size="lg" 
                            onClick={() => setPage(p => p + 1)}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary rounded-2xl gap-3 border-2 border-dashed border-border/80 hover:border-primary/40 px-10 h-14 transition-all"
                          >
                            <TrendingUp className="h-4 w-4" />
                            Load More Activities
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="border border-border/50 shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden bg-card/40 backdrop-blur-sm">
                <CardHeader className="bg-muted/10 p-5 border-b border-border/50">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-primary" />
                    Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {activeGroup.members.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between group/member p-1 transition-transform active:scale-95 cursor-default">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 rounded-2xl border-2 border-background bg-background shadow-md transition-transform group-hover/member:rotate-2">
                          {member.user.image ? <AvatarImage src={member.user.image} /> : null}
                          <AvatarFallback className="font-black text-xs bg-muted text-muted-foreground">
                            {member.user.name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-black leading-none text-foreground">{member.user.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5 font-bold opacity-70 truncate max-w-[120px]">{member.user.email}</p>
                        </div>
                      </div>
                      {member.userId === activeGroup.ownerId ? (
                        <span className="text-[8px] font-black tracking-widest uppercase px-2 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">Creator</span>
                      ) : member.userId === user?.id && (
                        <span className="text-[8px] font-black tracking-widest uppercase px-2 py-1 bg-muted/60 text-muted-foreground rounded-lg">You</span>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline"
                    className="w-full rounded-2xl border-2 border-dashed h-14 gap-3 mt-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all hover:border-primary/50 shadow-sm"
                    onClick={() => {
                      setSelectedGroup(activeGroup);
                      setIsAddMemberOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-2xl shadow-primary/20 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-indigo-700 text-primary-foreground p-8 relative group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-24 w-24 bg-black/10 rounded-full blur-2xl" />
                
                <div className="relative z-10 space-y-6">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Total Shared</p>
                    <p className="text-4xl font-black tracking-tighter tabular-nums drop-shadow-lg leading-none">
                      {formatCurrency(activities.filter((a: any) => a.userId === user?.id).reduce((sum: number, a: any) => sum + a.amount, 0), settings.currency)}
                    </p>
                  </div>
                  <Button 
                    className="w-full bg-white text-primary rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest hover:bg-white/95 shadow-xl shadow-black/20 hover:translate-y-[-2px] transition-all"
                    onClick={() => {
                      setSelectedGroup(activeGroup);
                      setIsSplitOpen(true);
                      setSelectedMembers(activeGroup.members.map((m: any) => m.userId));
                    }}
                  >
                    Create Split
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-4 md:p-8 border border-primary/10">
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-0.5">
            {groups.map((group: any) => (
              <Card 
                key={group.id} 
                onClick={() => setActiveGroupId(group.id)}
                className="shadow-sm rounded-3xl overflow-hidden hover:scale-[1.01] transition-all duration-300 border border-border hover:border-primary/40 flex flex-col cursor-pointer group/card bg-card/40 backdrop-blur-sm"
              >
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/20">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 3).map((m: any) => (
                          <div key={m.userId} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
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
                        <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => { 
                        e.stopPropagation();
                        setSelectedGroup(group); 
                        setIsAddMemberOpen(true); 
                      }}
                      variant="outline" size="sm" className="flex-1 rounded-xl h-10 gap-2 font-bold border-none bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite
                    </Button>
                    <Button 
                      onClick={(e) => { 
                        e.stopPropagation();
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
        </>
      )}

      {/* Global Dialogs */}
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
                        {u.name?.[0] || u.email?.[0]?.toUpperCase() || 'U'}
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
                <SelectContent className="rounded-xl" sideOffset={4}>
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
                  {selectedMembers.length > 0 ? formatCurrency(parseFloat(splitAmount || '0') / (selectedMembers.length || 1), settings.currency) : '0'} each
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
               className="w-full rounded-xl h-12 font-bold"
            >
              {splitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Split'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </VaultGuard>
  );
}
