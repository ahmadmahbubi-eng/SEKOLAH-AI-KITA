export const META_PIXEL_ID = '1111405168537688';

const CONSENT_STORAGE_KEY = 'sakita_privacy_consent';
const LEAD_DEDUPE_STORAGE_KEY = 'sakita_meta_tracked_leads_v1';

export type PixelConsentStatus = 'granted' | 'denied';

type FbqFunction = {
  (command: 'init', pixelId: string): void;
  (command: 'consent', action: 'grant' | 'revoke'): void;
  (
    command: 'track',
    eventName: string,
    params?: Record<string, unknown>,
    options?: { eventID?: string },
  ): void;
};

interface SakitaPixelState {
  pixelId: string;
  initialized: boolean;
  lastPageViewPath: string;
  trackedLeads: Record<string, true>;
}

declare global {
  interface Window {
    fbq?: FbqFunction;
    __SAKITA_META_PIXEL__?: SakitaPixelState;
    doNotTrack?: string;
  }
}

function getPixelState(): SakitaPixelState {
  if (!window.__SAKITA_META_PIXEL__) {
    window.__SAKITA_META_PIXEL__ = {
      pixelId: META_PIXEL_ID,
      initialized: false,
      lastPageViewPath: '',
      trackedLeads: {},
    };
  }
  return window.__SAKITA_META_PIXEL__;
}

function isBrowserDoNotTrackEnabled(): boolean {
  try {
    const dnt =
      navigator.doNotTrack ||
      window.doNotTrack ||
      (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
    return dnt === '1' || dnt === 'yes';
  } catch {
    return false;
  }
}

export function getMetaPixelConsent(): PixelConsentStatus {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === 'denied') return 'denied';
    if (stored === 'granted') return 'granted';
  } catch {
    // Ignore storage restriction (e.g. private browsing)
  }
  return isBrowserDoNotTrackEnabled() ? 'denied' : 'granted';
}

export function setMetaPixelConsent(status: PixelConsentStatus): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Ignore storage restriction
  }

  try {
    if (typeof window.fbq === 'function') {
      window.fbq('consent', status === 'granted' ? 'grant' : 'revoke');
    }
    if (status === 'granted') {
      trackMetaPageView();
    }
  } catch {
    // Never let analytics/adblock errors affect app behavior
  }
}

function isAdminPath(pathWithQuery: string): boolean {
  const cleanPath = pathWithQuery.split('?')[0].replace(/\/+$/, '') || '/';
  return cleanPath === '/admin' || cleanPath.startsWith('/admin/');
}

function makeEventId(prefix: string, seed?: string): string {
  if (seed) {
    const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, '');
    return `${prefix}_${safeSeed}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function trackMetaPageView(pathWithQuery?: string): void {
  try {
    const targetPath =
      pathWithQuery || `${window.location.pathname}${window.location.search}`;
    if (isAdminPath(targetPath)) return;

    const state = getPixelState();
    // Deduplicate: never fire PageView twice for the same route (prevents StrictMode & init double-firing)
    if (state.lastPageViewPath === targetPath) return;

    if (getMetaPixelConsent() !== 'granted') return;
    if (typeof window.fbq !== 'function') return;

    if (!state.initialized) {
      window.fbq('consent', 'grant');
      window.fbq('init', META_PIXEL_ID);
      state.initialized = true;
    }

    state.lastPageViewPath = targetPath;
    window.fbq('track', 'PageView', {}, { eventID: makeEventId('pv') });
  } catch {
    // Ignore ad-blocker or blocked network errors silently
  }
}

function loadPersistedLeadKeys(): Record<string, true> {
  try {
    const raw = window.sessionStorage.getItem(LEAD_DEDUPE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, true>;
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

function persistLeadKey(key: string): void {
  try {
    const existing = loadPersistedLeadKeys();
    existing[key] = true;
    window.sessionStorage.setItem(LEAD_DEDUPE_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage errors
  }
}

export interface MetaLeadPayload {
  registrationId: string;
  registrationNumber: string;
  programId: string;
  programName: string;
  amount: number;
  isWaitlist: boolean;
  privacyAccepted: boolean;
}

/**
 * Fires Meta Pixel "Lead" event strictly AFTER registration data is saved to Firestore,
 * with explicit user privacy agreement and multi-layer deduplication.
 */
export function trackMetaLead(payload: MetaLeadPayload): boolean {
  try {
    if (!payload.privacyAccepted) return false;
    if (!payload.registrationId || !payload.registrationNumber) return false;

    const consent = getMetaPixelConsent();
    if (consent !== 'granted') return false;

    const state = getPixelState();
    const dedupeKey = `${payload.registrationId}:${payload.registrationNumber}`;
    const persisted = loadPersistedLeadKeys();

    if (state.trackedLeads[dedupeKey] || persisted[dedupeKey]) {
      return false;
    }

    if (typeof window.fbq !== 'function') return false;

    if (!state.initialized) {
      window.fbq('consent', 'grant');
      window.fbq('init', META_PIXEL_ID);
      state.initialized = true;
    }

    state.trackedLeads[dedupeKey] = true;
    persistLeadKey(dedupeKey);

    window.fbq(
      'track',
      'Lead',
      {
        content_name: payload.programName,
        content_category: payload.isWaitlist
          ? 'Daftar Tunggu Pelatihan AI'
          : 'Pendaftaran Pelatihan AI',
        content_ids: [payload.programId],
        content_type: 'product',
        currency: 'IDR',
        value: Number.isFinite(payload.amount) ? payload.amount : 0,
      },
      { eventID: makeEventId('lead', payload.registrationNumber) },
    );

    return true;
  } catch {
    return false;
  }
}
