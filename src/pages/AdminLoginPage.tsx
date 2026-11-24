import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export function AdminLoginPage({ navigate }: AdminLoginPageProps) {
  const { user, isAdmin, loading, authError, loginWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin');
    }
  }, [loading, user, isAdmin, navigate]);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        navigate('/admin');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#080F1D] px-4 py-10 text-[#F8FAFC]">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#94A3B8] transition-colors hover:text-[#F8FAFC]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Halaman Utama</span>
        </button>
      </div>

      <div className="mx-auto my-8 w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A] p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <BrandMark brandName="SAKITA" variant="dark" />
          <span className="font-mono text-xs text-[#22D3EE]">COMMAND CENTER</span>
        </div>

        <h1 className="mt-6 font-display text-2xl font-bold text-[#F8FAFC]">
          Login Administrator
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          Masuk menggunakan akun Google terverifikasi yang terdaftar sebagai administrator resmi
          Sekolah AI Kita (SAKITA).
        </p>

        {authError && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        <button
          type="button"
          disabled={loading || signingIn}
          onClick={handleGoogleLogin}
          className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#22D3EE] px-5 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingIn || loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memverifikasi Sesi...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>Masuk dengan Akun Google Admin</span>
            </>
          )}
        </button>

        <div className="mt-6 border-t border-slate-800 pt-5 text-xs leading-relaxed text-[#94A3B8]">
          Autentikasi dilindungi oleh Firebase Authentication dan Role-Based Access Control (RBAC)
          pada Firestore Security Rules. Semua tindakan verifikasi dicatat pada audit log.
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Sekolah AI Kita (SAKITA) · Smart Registration System
      </p>
    </div>
  );
}
