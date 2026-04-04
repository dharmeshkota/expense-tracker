import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { setUser } = useStore();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin matches current site or local dev
      const origin = event.origin;
      if (!origin.endsWith('.vercel.app') && !origin.includes('localhost') && !origin.endsWith('.run.app')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetch('/api/auth/me')
          .then(res => res.json())
          .then(data => setUser(data))
          .catch(err => console.error('Auth success fetch failed:', err));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setUser]);

  const handleLogin = () => {
    try {
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      
      window.open(
        '/api/auth/google',
        'google_login',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-2xl">E</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-lg">
            Manage your expenses with elegance and ease.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <Button 
            onClick={handleLogin} 
            className="w-full h-12 text-lg font-semibold gap-3"
            size="lg"
          >
            <LogIn className="h-5 w-5" />
            Continue with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Securely access your personal finance dashboard
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
