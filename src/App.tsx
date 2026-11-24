import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { SuccessStatusPage } from './pages/SuccessStatusPage';

function AppRouter() {
  const [locationPath, setLocationPath] = useState<string>(
    () => window.location.pathname + window.location.search,
  );

  useEffect(() => {
    const onPopState = () => {
      setLocationPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', to);
    setLocationPath(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const url = new URL(locationPath, window.location.origin);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/admin/login') {
    return <AdminLoginPage navigate={navigate} />;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminDashboardPage navigate={navigate} />;
  }

  if (pathname === '/daftar') {
    const programParam = url.searchParams.get('program') || undefined;
    const tokenParam = url.searchParams.get('token') || undefined;
    return (
      <RegisterPage
        navigate={navigate}
        initialProgramId={programParam}
        resumeToken={tokenParam}
      />
    );
  }

  if (pathname.startsWith('/sukses/')) {
    const token = decodeURIComponent(pathname.slice('/sukses/'.length));
    return <SuccessStatusPage token={token} mode="success" navigate={navigate} />;
  }

  if (pathname.startsWith('/status/')) {
    const token = decodeURIComponent(pathname.slice('/status/'.length));
    return <SuccessStatusPage token={token} mode="status" navigate={navigate} />;
  }

  return <LandingPage navigate={navigate} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
