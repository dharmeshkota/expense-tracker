import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Sidebar, BottomNav } from './components/layout/Navigation';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Bills from './pages/Bills';
import Settings from './pages/Settings';
import Login from './pages/Login';

function App() {
  const { user, setUser, isLoading, setIsLoading } = useStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [setUser, setIsLoading]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/20" />
          <div className="h-4 w-32 rounded bg-muted" />
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
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <BottomNav />
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
