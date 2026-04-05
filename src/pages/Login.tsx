import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { LogIn, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { setUser } = useStore();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.vercel.app') && !origin.includes('localhost') && !origin.endsWith('.run.app')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        toast.success('Successfully logged in!');
        fetch('/api/auth/me')
          .then(res => res.json())
          .then(data => setUser(data))
          .catch(err => {
            console.error('Auth success fetch failed:', err);
            toast.error('Failed to retrieve user profile');
          });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setUser]);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get auth URL');
      }
      const { url } = await response.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      
      window.open(
        url,
        'google_login',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred during login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="max-w-md w-full space-y-12 text-center relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="space-y-6">
          <div className="h-24 w-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary/10 group hover:scale-110 transition-transform duration-500">
            <div className="h-12 w-12 bg-primary rounded-3xl rotate-12 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter text-foreground">ExpensePro</h1>
            <p className="text-muted-foreground text-xl font-medium max-w-[280px] mx-auto leading-tight">
              Master your finances with elegance and precision.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Button 
            onClick={handleLogin} 
            className="w-full h-16 text-lg font-bold gap-3 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            size="lg"
          >
            <LogIn className="h-6 w-6" />
            Continue with Google
          </Button>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground bg-muted/30 py-3 rounded-xl">
              <ShieldCheck className="h-4 w-4 text-primary" />
              SECURE AUTH
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground bg-muted/30 py-3 rounded-xl">
              <Zap className="h-4 w-4 text-primary" />
              INSTANT SYNC
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-medium max-w-[240px] mx-auto leading-relaxed">
          By continuing, you agree to our <span className="text-foreground underline cursor-pointer">Terms of Service</span> and <span className="text-foreground underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
