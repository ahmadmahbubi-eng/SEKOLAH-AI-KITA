import { useState } from 'react';
import { OFFICIAL_SAKITA_LOGO } from '../lib/defaults';

interface BrandMarkProps {
  logoUrl?: string;
  brandName?: string;
  variant?: 'dark' | 'light';
}

const WEB_OPTIMIZED_SAKITA_LOGO = '/assets/sakita-logo-web.png';

export function BrandMark({ logoUrl, brandName = 'SAKITA', variant = 'dark' }: BrandMarkProps) {
  const [imgError, setImgError] = useState(false);
  const rawLogo = logoUrl?.trim() || OFFICIAL_SAKITA_LOGO;
  const resolvedLogo = rawLogo === OFFICIAL_SAKITA_LOGO ? WEB_OPTIMIZED_SAKITA_LOGO : rawLogo;

  if (resolvedLogo && !imgError) {
    return (
      <span className="inline-flex items-center whitespace-nowrap shrink-0">
        <span
          className={`inline-flex items-center justify-center rounded-lg ${
            variant === 'dark' ? 'bg-white px-2.5 py-1 shadow-sm' : 'bg-white py-0.5'
          }`}
        >
          <img
            src={resolvedLogo}
            alt={brandName}
            width={108}
            height={36}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-9 w-auto max-w-[160px] object-contain"
          />
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold tracking-tight ${
          variant === 'dark'
            ? 'border-[#22D3EE]/35 bg-[#0F172A] text-[#22D3EE]'
            : 'border-slate-300 bg-slate-900 text-[#22D3EE]'
        }`}
        aria-hidden="true"
      >
        SK
      </span>
      <span
        className={`font-display text-lg font-bold tracking-tight ${
          variant === 'dark' ? 'text-[#F8FAFC]' : 'text-slate-900'
        }`}
      >
        {brandName}
      </span>
    </span>
  );
}
