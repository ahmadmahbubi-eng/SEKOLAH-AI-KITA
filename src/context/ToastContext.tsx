import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((variant: ToastVariant, title: string, description?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev.slice(-3), { id, variant, title, description }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="no-print fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        {items.map((item) => {
          const Icon =
            item.variant === 'success'
              ? CheckCircle2
              : item.variant === 'error'
                ? AlertCircle
                : Info;
          const toneClasses =
            item.variant === 'success'
              ? 'border-[#10B981]/35 bg-[#0F172A] text-[#F8FAFC]'
              : item.variant === 'error'
                ? 'border-rose-500/40 bg-[#0F172A] text-[#F8FAFC]'
                : 'border-[#22D3EE]/35 bg-[#0F172A] text-[#F8FAFC]';
          const iconTone =
            item.variant === 'success'
              ? 'text-[#10B981]'
              : item.variant === 'error'
                ? 'text-rose-400'
                : 'text-[#22D3EE]';

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all ${toneClasses}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconTone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Tutup notifikasi"
                className="rounded-md p-1 text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-[#F8FAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
