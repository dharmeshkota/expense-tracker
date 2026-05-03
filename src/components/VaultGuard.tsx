import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Shield, Lock, Key, Eye, EyeOff, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface VaultGuardProps {
  children?: React.ReactNode;
  mode?: 'blocking' | 'overlay';
}

export const VaultGuard: React.FC<VaultGuardProps> = ({ children, mode = 'blocking' }) => {
  const { vaultKey, setVaultKey, isVaultGuardOpen, setIsVaultGuardOpen, settings } = useStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // If vault is disabled in settings, don't show the guard unless it's explicitly opened for some reason (e.g. to enable it)
  const isVaultEnabled = settings.useVault;
  
  // In blocking mode, we show if (key is missing AND vault enabled) OR if manually opened
  // In overlay mode, we only show if manually opened
  const shouldShow = mode === 'blocking' 
    ? ((!vaultKey && isVaultEnabled) || isVaultGuardOpen) 
    : isVaultGuardOpen;

  if (!shouldShow) return <>{children}</>;

  const handleCancel = () => {
    setIsVaultGuardOpen(false);
    navigate('/settings?tab=privacy');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) return;
    setIsSubmitting(true);
    // Simulate a small delay for "security" feel
    setTimeout(() => {
      setVaultKey(password);
      setIsVaultGuardOpen(false);
      setIsSubmitting(false);
      setPassword('');
    }, 800);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05060a]/95 backdrop-blur-3xl p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md"
        >
          <Card className="border-primary/20 bg-[#0a0c14] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            
            <button 
              onClick={handleCancel}
              className="absolute top-4 right-4 z-50 p-2 text-muted-foreground/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <CardContent className="pt-10 pb-8 px-6 md:px-10 text-center relative z-10">
              <div className="mb-6 inline-flex p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-inner">
                <Shield className="h-10 w-10 text-primary animate-pulse" />
              </div>
              
              <h1 className="text-2xl md:text-3xl font-black mb-3 tracking-tight text-white">Advanced Security Vault</h1>
              <p className="text-muted-foreground text-sm mb-8 font-medium leading-relaxed">
                Provide a <span className="text-primary font-bold">Master Vault Key</span>. This key will be used as the actual <span className="text-white underline">Encryption Seed</span> for your data.
                <span className="block mt-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl text-xs text-left">
                  <span className="text-primary font-bold block mb-1">How it works:</span>
                  Your descriptions and amounts are scrambled locally in your browser using this key. Our server only sees <span className="italic font-mono">"0.00"</span> and junk text. 
                </span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5 block ml-1">Master Vault Key</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                      <Key className="h-4 w-4" />
                    </div>
                    <Input
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 4 characters..."
                      className="h-14 pl-12 pr-12 rounded-2xl bg-background/50 border-primary/20 focus:border-primary transition-all text-sm font-semibold tracking-widest"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit"
                  className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={password.length < 4 || isSubmitting}
                >
                  {isSubmitting ? "Locking Vault..." : "Unlock Secured Ledger"}
                </Button>
                
                {isVaultGuardOpen && vaultKey && (
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setIsVaultGuardOpen(false)}
                    className="w-full text-xs font-bold text-muted-foreground hover:bg-white/5 rounded-xl"
                  >
                    Cancel
                  </Button>
                )}
              </form>

              <div className="mt-8 flex items-start gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-left">
                <Info className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                 <div className="space-y-1">
                  <p className="text-[10px] text-red-300 font-bold uppercase tracking-widest">Permanent Data Lock Warning</p>
                  <p className="text-[10px] text-muted-foreground leading-normal italic">
                    We follow a <span className="text-foreground font-semibold">Zero-Knowledge Architecture</span>. If you lose this key, every transaction recorded with it is <span className="text-red-400 underline">gone forever</span>.
                    There is NO reset button, and NO support agent can recover it. Keep it in a password manager.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
