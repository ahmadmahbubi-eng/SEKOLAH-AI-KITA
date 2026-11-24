import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'Terjadi kesalahan sistem yang tidak terduga.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        readable = `Kendala akses data (${parsed.operationType || 'operasi'}): ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#080F1D] px-6 py-12 text-[#F8FAFC]">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A] p-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl font-semibold text-[#F8FAFC]">Terjadi Gangguan Aplikasi</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90"
            >
              <RotateCcw className="h-4 w-4" />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
