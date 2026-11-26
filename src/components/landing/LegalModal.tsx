import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  getMetaPixelConsent,
  setMetaPixelConsent,
  type PixelConsentStatus,
} from '../../lib/metaPixel';

interface LegalModalProps {
  title: string;
  content: string;
  open: boolean;
  onClose: () => void;
}

export function LegalModal({ title, content, open, onClose }: LegalModalProps) {
  const [pixelConsent, setPixelConsentState] = useState<PixelConsentStatus>(() =>
    getMetaPixelConsent(),
  );

  useEffect(() => {
    if (open) {
      setPixelConsentState(getMetaPixelConsent());
    }
  }, [open]);

  if (!open) return null;

  const isPrivacyModal = title.toLowerCase().includes('privasi');

  const handleToggleConsent = () => {
    const next: PixelConsentStatus = pixelConsent === 'granted' ? 'denied' : 'granted';
    setMetaPixelConsent(next);
    setPixelConsentState(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-[#0F172A] text-[#F8FAFC] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 id="legal-modal-title" className="font-display text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-[#F8FAFC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed text-[#94A3B8] whitespace-pre-line">
          {content || 'Ketentuan ini belum dilengkapi oleh administrator SAKITA.'}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          {isPrivacyModal ? (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#94A3B8]">
              <input
                type="checkbox"
                checked={pixelConsent === 'granted'}
                onChange={handleToggleConsent}
                className="h-4 w-4 rounded accent-[#22D3EE]"
              />
              <span>Izinkan pelacakan analitik Meta Pixel</span>
            </label>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#22D3EE] px-4 py-2 text-sm font-semibold text-[#080F1D] transition-colors hover:bg-[#22D3EE]/90"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
