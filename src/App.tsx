import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { trackMetaPageView } from './lib/metaPixel';
import { LandingPage } from './pages/LandingPage';

const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const SuccessStatusPage = lazy(() =>
  import('./pages/SuccessStatusPage').then((m) => ({ default: m.SuccessStatusPage })),
);
const AdminLoginPage = lazy(() =>
  import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AuthProviderLazy = lazy(() =>
  import('./context/AuthContext').then((m) => ({ default: m.AuthProvider })),
);

function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080F1D] text-[#F8FAFC]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#22D3EE]/25 border-t-[#22D3EE]" />
      <p className="mt-3 text-xs text-[#94A3B8]">Memuat halaman SAKITA...</p>
    </div>
  );
}

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

  useEffect(() => {
    trackMetaPageView(locationPath);
  }, [locationPath]);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', to);
    setLocationPath(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const url = new URL(locationPath, window.location.origin);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/admin/login') {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthProviderLazy>
          <AdminLoginPage navigate={navigate} />
        </AuthProviderLazy>
      </Suspense>
    );
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthProviderLazy>
          <AdminDashboardPage navigate={navigate} />
        </AuthProviderLazy>
      </Suspense>
    );
  }

  if (pathname === '/daftar') {
    const programParam = url.searchParams.get('program') || undefined;
    const tokenParam = url.searchParams.get('token') || undefined;
    const paketParam = url.searchParams.get('paket') || undefined;
    return (
      <Suspense fallback={<PageLoader />}>
        <RegisterPage
          navigate={navigate}
          initialProgramId={programParam}
          initialPackageCode={paketParam}
          resumeToken={tokenParam}
        />
      </Suspense>
    );
  }

  if (pathname.startsWith('/sukses/')) {
    const token = decodeURIComponent(pathname.slice('/sukses/'.length));
    return (
      <Suspense fallback={<PageLoader />}>
        <SuccessStatusPage token={token} mode="success" navigate={navigate} />
      </Suspense>
    );
  }

  if (pathname.startsWith('/status/')) {
    const token = decodeURIComponent(pathname.slice('/status/'.length));
    return (
      <Suspense fallback={<PageLoader />}>
        <SuccessStatusPage token={token} mode="status" navigate={navigate} />
      </Suspense>
    );
  }

  if (pathname.startsWith('/program/')) {
    const slug = decodeURIComponent(pathname.slice('/program/'.length)).replace(/\/+$/, '');
    return <LandingPage navigate={navigate} initialProgramSlug={slug} />;
  }

  const programQuery = url.searchParams.get('program') || undefined;
  return <LandingPage navigate={navigate} initialProgramSlug={programQuery} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
