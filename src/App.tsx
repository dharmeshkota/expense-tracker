import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Sidebar, BottomNav } from './components/layout/Navigation';
import { Toaster } from '@/components/ui/sonner';
import { VaultGuard } from './components/VaultGuard';
import Dashboard from './pages/Dashboard';
import Bills from './pages/Bills';
import Settings from './pages/Settings';
import Transactions from './pages/Transactions';
import Insights from './pages/Insights';
import Categories from './pages/Categories';
import Groups from './pages/Groups';
import Login from './pages/Login';

import { AIAssistant } from './components/ai/AIAssistant';

function App() {
  const { user, setUser, isLoading, setIsLoading, settings, setCategories } = useStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Add a small delay for the very first check to avoid "Failed to fetch" on cold start
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          
          // Fetch categories after successful auth
          const catRes = await fetch('/api/categories');
          if (catRes.ok) {
            const catData = await catRes.json();
            setCategories(catData);
          }
        }
      } catch (error) {
        console.warn('Auth check connection issue:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [setUser, setIsLoading, setCategories]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
            <div className="h-8 w-8 bg-primary rounded-2xl rotate-12" />
          </div>
          <div className="h-4 w-32 rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-background font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden">
        <VaultGuard mode="overlay" />
        <Sidebar />
        <main className="flex-1 md:pl-64 pb-16 md:pb-0 min-h-screen">
          <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <BottomNav />
        <AIAssistant />
        <Toaster position="top-center" expand={true} richColors />
      </div>
    </Router>
  );
}

export default App;
