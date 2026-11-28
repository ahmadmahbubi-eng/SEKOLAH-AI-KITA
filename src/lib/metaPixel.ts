export const META_PIXEL_ID = '1111405168537688';

const CONSENT_STORAGE_KEY = 'sakita_privacy_consent';
const LEAD_DEDUPE_STORAGE_KEY = 'sakita_meta_tracked_leads_v1';
const SESSION_EVENTS_STORAGE_KEY = 'sakita_meta_session_events_v1';
const PURCHASE_DEDUPE_STORAGE_KEY = 'sakita_meta_tracked_purchases_v1';

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
  trackedSessionEvents?: Record<string, true>;
  trackedPurchases?: Record<string, true>;
  lastContactAt?: Record<string, number>;
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
      trackedSessionEvents: {},
      trackedPurchases: {},
      lastContactAt: {},
    };
  }
  if (!window.__SAKITA_META_PIXEL__.trackedSessionEvents) {
    window.__SAKITA_META_PIXEL__.trackedSessionEvents = {};
  }
  if (!window.__SAKITA_META_PIXEL__.trackedPurchases) {
    window.__SAKITA_META_PIXEL__.trackedPurchases = {};
  }
  if (!window.__SAKITA_META_PIXEL__.lastContactAt) {
    window.__SAKITA_META_PIXEL__.lastContactAt = {};
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

function ensurePixelReady(): boolean {
  if (isAdminPath(`${window.location.pathname}${window.location.search}`)) return false;
  if (getMetaPixelConsent() !== 'granted') return false;
  if (typeof window.fbq !== 'function') return false;

  const state = getPixelState();
  if (!state.initialized) {
    window.fbq('consent', 'grant');
    window.fbq('init', META_PIXEL_ID);
    state.initialized = true;
  }
  return true;
}

function loadStorageMap(storage: Storage, key: string): Record<string, true> {
  try {
    const raw = storage.getItem(key);
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

function saveStorageKey(storage: Storage, storageKey: string, entryKey: string): void {
  try {
    const existing = loadStorageMap(storage, storageKey);
    existing[entryKey] = true;
    storage.setItem(storageKey, JSON.stringify(existing));
  } catch {
    // Ignore storage errors
  }
}

export function trackMetaPageView(pathWithQuery?: string): void {
  try {
    const targetPath =
      pathWithQuery || `${window.location.pathname}${window.location.search}`;
    if (isAdminPath(targetPath)) return;

    const state = getPixelState();
    // Deduplicate: never fire PageView twice for the same route (prevents StrictMode & init double-firing)
    if (state.lastPageViewPath === targetPath) return;

    if (!ensurePixelReady()) return;

    state.lastPageViewPath = targetPath;
    window.fbq!('track', 'PageView', {}, { eventID: makeEventId('pv') });
  } catch {
    // Ignore ad-blocker or blocked network errors silently
  }
}

export interface MetaViewContentPayload {
  programId: string;
  programName: string;
  price: number;
}

/**
 * Fires Meta Pixel "ViewContent" once per session per program viewed on the public landing page.
 * Sends strictly non-PII product metadata.
 */
export function trackMetaViewContent(payload: MetaViewContentPayload): boolean {
  try {
    if (!payload.programId || !payload.programName) return false;
    if (!ensurePixelReady()) return false;

    const state = getPixelState();
    const key = `vc:${payload.programId}`;
    const persisted = loadStorageMap(window.sessionStorage, SESSION_EVENTS_STORAGE_KEY);
    if (state.trackedSessionEvents?.[key] || persisted[key]) {
      return false;
    }

    state.trackedSessionEvents![key] = true;
    saveStorageKey(window.sessionStorage, SESSION_EVENTS_STORAGE_KEY, key);

    window.fbq!(
      'track',
      'ViewContent',
      {
        content_name: payload.programName,
        content_category: 'Pelatihan AI Pendidikan',
        content_ids: [payload.programId],
        content_type: 'product',
        currency: 'IDR',
        value: Number.isFinite(payload.price) ? payload.price : 0,
      },
      { eventID: makeEventId('vc', payload.programId) },
    );
    return true;
  } catch {
    return false;
  }
}

export interface MetaContactPayload {
  source: string;
  programName?: string;
}

/**
 * Fires Meta Pixel "Contact" when a visitor clicks official WhatsApp admin contact links.
 * Throttled per source to avoid accidental double-click noise; sends zero PII.
 */
export function trackMetaContact(payload: MetaContactPayload): boolean {
  try {
    if (!ensurePixelReady()) return false;
    const state = getPixelState();
    const now = Date.now();
    const last = state.lastContactAt?.[payload.source] || 0;
    if (now - last < 4000) return false;
    state.lastContactAt![payload.source] = now;

    window.fbq!(
      'track',
      'Contact',
      {
        content_name: payload.programName || 'Konsultasi Admin SAKITA',
        content_category: payload.source || 'whatsapp_cta',
      },
      { eventID: makeEventId('contact') },
    );
    return true;
  } catch {
    return false;
  }
}

export interface MetaInitiateCheckoutPayload {
  programId: string;
  programName: string;
  price: number;
}

/**
 * Fires Meta Pixel "InitiateCheckout" once per session per program when entering the registration form.
 * Sends strictly non-PII program metadata.
 */
export function trackMetaInitiateCheckout(payload: MetaInitiateCheckoutPayload): boolean {
  try {
    if (!payload.programId || !payload.programName) return false;
    if (!ensurePixelReady()) return false;

    const state = getPixelState();
    const key = `ic:${payload.programId}`;
    const persisted = loadStorageMap(window.sessionStorage, SESSION_EVENTS_STORAGE_KEY);
    if (state.trackedSessionEvents?.[key] || persisted[key]) {
      return false;
    }

    state.trackedSessionEvents![key] = true;
    saveStorageKey(window.sessionStorage, SESSION_EVENTS_STORAGE_KEY, key);

    window.fbq!(
      'track',
      'InitiateCheckout',
      {
        content_name: payload.programName,
        content_category: 'Pendaftaran Pelatihan AI',
        content_ids: [payload.programId],
        content_type: 'product',
        currency: 'IDR',
        num_items: 1,
        value: Number.isFinite(payload.price) ? payload.price : 0,
      },
      { eventID: makeEventId('ic', payload.programId) },
    );
    return true;
  } catch {
    return false;
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
 * with explicit user privacy agreement and multi-layer deduplication. Zero PII sent.
 */
export function trackMetaLead(payload: MetaLeadPayload): boolean {
  try {
    if (!payload.privacyAccepted) return false;
    if (!payload.registrationId || !payload.registrationNumber) return false;
    if (!ensurePixelReady()) return false;

    const state = getPixelState();
    const dedupeKey = `${payload.registrationId}:${payload.registrationNumber}`;
    const persisted = loadStorageMap(window.sessionStorage, LEAD_DEDUPE_STORAGE_KEY);

    if (state.trackedLeads[dedupeKey] || persisted[dedupeKey]) {
      return false;
    }

    state.trackedLeads[dedupeKey] = true;
    saveStorageKey(window.sessionStorage, LEAD_DEDUPE_STORAGE_KEY, dedupeKey);

    window.fbq!(
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

/**
 * Fires Meta Pixel "CompleteRegistration" strictly AFTER registration is persisted to Firestore
 * with explicit privacy consent and deduplication. Zero PII sent.
 */
export function trackMetaCompleteRegistration(payload: MetaLeadPayload): boolean {
  try {
    if (!payload.privacyAccepted) return false;
    if (!payload.registrationId || !payload.registrationNumber) return false;
    if (!ensurePixelReady()) return false;

    const state = getPixelState();
    const key = `cr:${payload.registrationId}:${payload.registrationNumber}`;
    const persisted = loadStorageMap(window.sessionStorage, SESSION_EVENTS_STORAGE_KEY);
    if (state.trackedSessionEvents?.[key] || persisted[key]) {
      return false;
    }

    state.trackedSessionEvents![key] = true;
    saveStorageKey(window.sessionStorage, SESSION_EVENTS_STORAGE_KEY, key);

    window.fbq!(
      'track',
      'CompleteRegistration',
      {
        content_name: payload.programName,
        status: payload.isWaitlist ? 'waitlist' : 'registered',
        currency: 'IDR',
        value: Number.isFinite(payload.amount) ? payload.amount : 0,
      },
      { eventID: makeEventId('cr', payload.registrationNumber) },
    );
    return true;
  } catch {
    return false;
  }
}

export interface MetaPurchasePayload {
  registrationId: string;
  registrationNumber: string;
  programId: string;
  programName: string;
  amount: number;
  paymentStatus: string;
}

/**
 * Fires Meta Pixel "Purchase" STRICTLY ONLY after payment has been officially verified
 * as LUNAS by admin. Persistently deduplicated in localStorage per registrationNumber
 * so it never double-fires on page reloads and never fires on unverified uploads. Zero PII sent.
 */
export function trackMetaPurchase(payload: MetaPurchasePayload): boolean {
  try {
    if (payload.paymentStatus !== 'lunas') return false;
    if (!payload.registrationNumber || !payload.programId) return false;
    if (!ensurePixelReady()) return false;

    const state = getPixelState();
    const key = `purchase:${payload.registrationNumber}`;
    const persisted = loadStorageMap(window.localStorage, PURCHASE_DEDUPE_STORAGE_KEY);
    if (state.trackedPurchases?.[key] || persisted[key]) {
      return false;
    }

    state.trackedPurchases![key] = true;
    saveStorageKey(window.localStorage, PURCHASE_DEDUPE_STORAGE_KEY, key);

    window.fbq!(
      'track',
      'Purchase',
      {
        content_name: payload.programName,
        content_category: 'Pelatihan AI Pendidikan',
        content_ids: [payload.programId],
        content_type: 'product',
        currency: 'IDR',
        num_items: 1,
        value: Number.isFinite(payload.amount) ? payload.amount : 0,
      },
      { eventID: makeEventId('purchase', payload.registrationNumber) },
    );
    return true;
  } catch {
    return false;
  }
}
