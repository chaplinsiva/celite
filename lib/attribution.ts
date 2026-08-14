// agent-notes: { ctx: "Attribution capture and source normalization utility", deps: [], state: active, last: "sato@2026-08-14" }

export const ATTRIBUTION_STORAGE_KEY = 'celite_attribution';

export type AttributionSource =
  | 'Instagram Paid'
  | 'Instagram Organic'
  | 'Facebook Paid'
  | 'Facebook Organic'
  | 'Google Ads'
  | 'Google Organic'
  | 'YouTube'
  | 'Direct'
  | 'Referral'
  | 'ChatGPT / AI'
  | 'Other';

export interface TouchPoint {
  source: string;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  landingPage: string;
  referrer?: string | null;
  productViewed?: string | null;
  timestamp: string;
}

export interface AttributionData {
  anonymousId: string;
  firstTouch: TouchPoint;
  lastTouch: TouchPoint;
}

const SENSITIVE_PARAMS = new Set([
  'password',
  'token',
  'secret',
  'access_token',
  'refresh_token',
  'api_key',
  'auth',
  'code',
  'state',
  'id_token',
  'session',
]);

const MAX_STRING_LENGTH = 256;

function truncate(str?: string | null): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_STRING_LENGTH);
}

export function generateAnonymousId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'anon_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Strips sensitive query parameters from a URL or path
 */
export function sanitizeUrl(urlStr: string): string {
  if (!urlStr) return '/';
  try {
    const isAbsolute = urlStr.startsWith('http://') || urlStr.startsWith('https://');
    const parsed = new URL(urlStr, 'https://celite.in');
    
    // Remove sensitive params
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(k => parsed.searchParams.delete(k));

    if (isAbsolute) {
      return parsed.toString();
    }
    return parsed.pathname + (parsed.search ? parsed.search : '');
  } catch {
    return urlStr.slice(0, MAX_STRING_LENGTH);
  }
}

/**
 * Normalizes UTM parameters and referrer into one of the 11 standard sources
 */
export function normalizeSource(params: {
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
}): AttributionSource {
  const source = (params.utm_source || '').toLowerCase().trim();
  const medium = (params.utm_medium || '').toLowerCase().trim();
  const referrer = (params.referrer || '').toLowerCase().trim();
  const hasGclid = Boolean(params.gclid);
  const hasFbclid = Boolean(params.fbclid);

  const isPaidMedium = /^(cpc|ppc|paid|paid_social|paidsocial|ads|ad|display|sponsor|meta|ig_paid)$/i.test(medium);

  // 1. Google
  if (source.includes('google') || hasGclid) {
    if (isPaidMedium || hasGclid || medium.includes('cpc') || medium.includes('ads')) {
      return 'Google Ads';
    }
    return 'Google Organic';
  }

  // 2. Instagram
  if (source.includes('instagram') || source.includes('ig') || referrer.includes('instagram.com') || referrer.includes('l.instagram.com')) {
    if (isPaidMedium || source.includes('paid')) {
      return 'Instagram Paid';
    }
    return 'Instagram Organic';
  }

  // 3. Facebook
  if (source.includes('facebook') || source.includes('fb') || hasFbclid || referrer.includes('facebook.com') || referrer.includes('fb.me') || referrer.includes('l.facebook.com')) {
    if (isPaidMedium || source.includes('paid')) {
      return 'Facebook Paid';
    }
    return 'Facebook Organic';
  }

  // 4. YouTube
  if (source.includes('youtube') || referrer.includes('youtube.com') || referrer.includes('youtu.be')) {
    return 'YouTube';
  }

  // 5. ChatGPT / AI Search
  if (
    source.includes('chatgpt') ||
    source.includes('openai') ||
    source.includes('claude') ||
    source.includes('anthropic') ||
    source.includes('perplexity') ||
    referrer.includes('chatgpt.com') ||
    referrer.includes('openai.com') ||
    referrer.includes('claude.ai') ||
    referrer.includes('perplexity.ai')
  ) {
    return 'ChatGPT / AI';
  }

  // 6. Referrer checks if no UTM source matched
  if (!source) {
    if (referrer) {
      if (referrer.includes('google.')) {
        return 'Google Organic';
      }
      if (referrer.includes('bing.') || referrer.includes('yahoo.') || referrer.includes('duckduckgo.')) {
        return 'Other';
      }
      // Check if external referrer (not celite.in)
      try {
        const refUrl = new URL(referrer);
        const host = refUrl.hostname.toLowerCase();
        if (!host.includes('celite.in') && host !== 'localhost' && host !== '127.0.0.1') {
          return 'Referral';
        }
      } catch {
        if (!referrer.includes('celite.in')) {
          return 'Referral';
        }
      }
    }
    return 'Direct';
  }

  // Fallback for custom or unrecognized sources
  return 'Other';
}

/**
 * Reads attribution data safely from localStorage
 */
export function getStoredAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse stored attribution:', e);
    return null;
  }
}

/**
 * Writes attribution data safely to localStorage
 */
export function setStoredAttribution(data: AttributionData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save attribution to localStorage:', e);
  }
}

/**
 * Clears stored attribution from localStorage
 */
export function clearStoredAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear attribution from localStorage:', e);
  }
}

/**
 * Records product viewed into attribution state
 */
export function recordProductView(slug: string): AttributionData | null {
  if (typeof window === 'undefined' || !slug) return null;
  const current = getStoredAttribution();
  if (!current) return null;

  const cleanSlug = truncate(slug);
  if (!cleanSlug) return current;

  const updated: AttributionData = {
    ...current,
    firstTouch: {
      ...current.firstTouch,
      productViewed: current.firstTouch.productViewed || cleanSlug,
    },
    lastTouch: {
      ...current.lastTouch,
      productViewed: cleanSlug,
    },
  };

  setStoredAttribution(updated);
  return updated;
}

export interface CaptureOptions {
  url?: string;
  referrer?: string;
  pathname?: string;
}

/**
 * Captures current page touchpoint, updates last touch, and preserves first touch.
 */
export function captureAttribution(options?: CaptureOptions): AttributionData | null {
  if (typeof window === 'undefined' && !options?.url) return null;

  const urlStr = options?.url || (typeof window !== 'undefined' ? window.location.href : '/');
  const referrerStr = options?.referrer !== undefined
    ? options.referrer
    : (typeof document !== 'undefined' ? document.referrer : '');
  
  let searchParams: URLSearchParams;
  let fullPath: string;

  try {
    const parsed = new URL(urlStr, 'https://celite.in');
    searchParams = parsed.searchParams;
    fullPath = sanitizeUrl(parsed.pathname + (parsed.search ? parsed.search : ''));
  } catch {
    searchParams = new URLSearchParams();
    fullPath = sanitizeUrl(urlStr);
  }

  const utm_source = searchParams.get('utm_source');
  const utm_medium = searchParams.get('utm_medium');
  const utm_campaign = searchParams.get('utm_campaign');
  const utm_content = searchParams.get('utm_content');
  const utm_term = searchParams.get('utm_term');
  const gclid = searchParams.get('gclid');
  const fbclid = searchParams.get('fbclid');

  const normalized = normalizeSource({
    utm_source,
    utm_medium,
    referrer: referrerStr,
    gclid,
    fbclid,
  });

  const nowIso = new Date().toISOString();

  // Check if current visit is a new campaign/source touch or direct internal page view
  const hasMarketingParams = Boolean(utm_source || utm_campaign || utm_medium || gclid || fbclid);
  const isExternalReferrer = Boolean(
    referrerStr &&
    !referrerStr.includes('celite.in') &&
    !referrerStr.includes('localhost') &&
    !referrerStr.includes('127.0.0.1')
  );

  const newTouchPoint: TouchPoint = {
    source: normalized,
    medium: truncate(utm_medium),
    campaign: truncate(utm_campaign),
    content: truncate(utm_content),
    term: truncate(utm_term),
    landingPage: truncate(fullPath) || '/',
    referrer: truncate(referrerStr),
    timestamp: nowIso,
  };

  const existing = getStoredAttribution();

  if (!existing) {
    // First visit for this browser
    const initialData: AttributionData = {
      anonymousId: generateAnonymousId(),
      firstTouch: newTouchPoint,
      lastTouch: newTouchPoint,
    };
    setStoredAttribution(initialData);
    return initialData;
  }

  // If visit has new marketing parameters or comes from an external referrer, update last touch
  if (hasMarketingParams || isExternalReferrer) {
    const updatedData: AttributionData = {
      ...existing,
      lastTouch: {
        ...newTouchPoint,
        productViewed: existing.lastTouch?.productViewed || existing.firstTouch?.productViewed || null,
      },
    };
    setStoredAttribution(updatedData);
    return updatedData;
  }

  // Otherwise, maintain existing touches
  return existing;
}
