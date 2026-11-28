import { useEffect, useState } from 'react';
import { isSafeImageUrl, resolvePublicAssetUrl } from '../lib/sakitaService';

interface ResolvedAssetImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fallback?: React.ReactNode;
}

export function ResolvedAssetImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fallback = null,
}: ResolvedAssetImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => {
    if (!src || !isSafeImageUrl(src)) return '';
    return src.startsWith('firestore-asset:') ? '' : src;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    if (!src || !isSafeImageUrl(src)) {
      setResolvedSrc('');
      return;
    }

    if (!src.startsWith('firestore-asset:')) {
      setResolvedSrc(src);
      return;
    }

    void resolvePublicAssetUrl(src)
      .then((url) => {
        if (!active) return;
        if (url) {
          setResolvedSrc(url);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (!src || failed || !resolvedSrc) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
