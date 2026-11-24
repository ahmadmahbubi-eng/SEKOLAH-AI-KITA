import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { bootstrapAdminEnvironment } from '../lib/sakitaService';

const BOOTSTRAP_ADMIN_EMAIL = 'ahmadmahbubi@gmail.com';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const email = (currentUser.email || '').toLowerCase();
      const verified = currentUser.emailVerified === true;

      if (!verified) {
        setIsAdmin(false);
        setAuthError('Email akun Google Anda belum terverifikasi.');
        setLoading(false);
        return;
      }

      if (email === BOOTSTRAP_ADMIN_EMAIL) {
        setIsAdmin(true);
        try {
          await bootstrapAdminEnvironment();
        } catch (err) {
          console.error('Admin bootstrap error:', err);
        }
        setLoading(false);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
        if (adminSnap.exists() && adminSnap.data()?.active === true) {
          setIsAdmin(true);
          await bootstrapAdminEnvironment();
        } else {
          setIsAdmin(false);
          setAuthError('Akun ini tidak memiliki izin administrator SAKITA.');
        }
      } catch {
        setIsAdmin(false);
        setAuthError('Akun ini tidak terdaftar sebagai administrator SAKITA.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase();
      if (!result.user.emailVerified) {
        await signOut(auth);
        setAuthError('Akun Google Anda harus memiliki email terverifikasi.');
        return false;
      }
      if (email === BOOTSTRAP_ADMIN_EMAIL) {
        return true;
      }
      const adminSnap = await getDoc(doc(db, 'admins', result.user.uid));
      if (adminSnap.exists() && adminSnap.data()?.active === true) {
        return true;
      }
      await signOut(auth);
      setAuthError('Akses ditolak. Akun Anda tidak memiliki peran administrator SAKITA.');
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError('Gagal memproses login Google. Pastikan popup diizinkan oleh browser Anda.');
      }
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, authError, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
