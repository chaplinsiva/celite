// agent-notes: { ctx: "Universal Attribution capture, source normalization, and analytics utility", deps: [], state: active, last: "sato@2026-08-16" }

export const ATTRIBUTION_STORAGE_KEY = 'celite_attribution';
export const SESSION_STORAGE_KEY = 'celite_session_id';
export const SESSION_TIMESTAMP_KEY = 'celite_session_last_active';
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity

export type AttributionSource =
  | 'Instagram Paid'
  | 'Instagram Organic'
  | 'Facebook Paid'
  | 'Facebook Organic'
  | 'YouTube Paid'
  | 'YouTube Organic'
  | 'Google Ads'
  | 'Google Organic'
  | 'Bing Search'
  | 'DuckDuckGo Search'
  | 'ChatGPT / AI'
  | 'Referral'
  | 'WhatsApp'
  | 'Email'
  | 'Genuine Direct'
  | 'Direct (Previously Attributed)'
  | 'Direct'
  | 'Unknown / Referrer Missing'
  | 'Unknown'
  | 'Other';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceResult {
  level: ConfidenceLevel;
  reason: string;
}

export type EventType =
  | 'landing'
  | 'homepage'
  | 'category_view'
  | 'product_view'
  | 'pricing_view'
  | 'signup'
  | 'login'
  | 'checkout_started'
  | 'payment_started'
  | 'payment_success'
  | 'subscription_created';

export interface TouchPoint {
  source: string;
  medium?: string | null;
  campaign?: string | null;
  campaign_id?: string | null;
  content?: string | null;
  content_id?: string | null;
  term?: string | null;
  term_id?: string | null;
  landingPage: string;
  referrer?: string | null;
  referrerDomain?: string | null;
  productViewed?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  dclid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
  utm_id?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  confidence?: ConfidenceLevel;
  confidence_reason?: string | null;
  timestamp: string;
}

export interface AttributionData {
  anonymousId: string;
  sessionId: string;
  firstTouch: TouchPoint;
  lastTouch: TouchPoint;
  touchCount: number;
}

export interface RegistryMapping {
  id?: string;
  platform: string;
  source: string;
  medium: string;
  campaign_name?: string | null;
  campaign_id?: string | null;
  adset_name?: string | null;
  adset_id?: string | null;
  ad_or_video_name?: string | null;
  ad_or_video_id?: string | null;
  content_name?: string | null;
  content_id?: string | null;
  product_slug?: string | null;
  destination_url?: string | null;
  is_active?: boolean;
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
  'signature',
  'razorpay_signature',
  'razorpay_payment_id',
  'cvv',
  'card',
]);

const MAX_STRING_LENGTH = 256;

export function truncate(str?: string | null): string | null {
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

export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  try {
    const now = Date.now();
    const lastActiveStr = window.sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
    const existingSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (existingSession && lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (now - lastActive < SESSION_TIMEOUT_MS) {
        window.sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
        return existingSession;
      }
    }

    // Generate new session after timeout or initial visit
    const newSession = generateSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, newSession);
    window.sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
    return newSession;
  } catch {
    return generateSessionId();
  }
}

/**
 * Strips sensitive query parameters from a URL or path
 */
export function sanitizeUrl(urlStr: string): string {
  if (!urlStr) return '/';
  try {
    const isAbsolute = urlStr.startsWith('http://') || urlStr.startsWith('https://');
    const parsed = new URL(urlStr, 'https://celite.in');

    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((k) => parsed.searchParams.delete(k));

    if (isAbsolute) {
      return parsed.toString();
    }
    return parsed.pathname + (parsed.search ? parsed.search : '');
  } catch {
    return urlStr.slice(0, MAX_STRING_LENGTH);
  }
}

/**
 * Extracts referrer domain cleanly
 */
export function extractReferrerDomain(referrerStr?: string | null): string | null {
  if (!referrerStr) return null;
  try {
    const url = new URL(referrerStr);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Detects device, browser, and OS client environment
 */
export function detectClientEnvironment(): { device: string; browser: string; os: string } {
  if (typeof navigator === 'undefined') {
    return { device: 'Desktop', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = navigator.userAgent;

  // Device
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  // OS
  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser
  let browser = 'Unknown';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return { device, browser, os };
}

/**
 * Normalizes UTM parameters, platform identifiers, and referrers into standard sources
 */
export function normalizeSource(params: {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  dclid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
}): AttributionSource {
  const source = (params.utm_source || '').toLowerCase().trim();
  const medium = (params.utm_medium || '').toLowerCase().trim();
  const referrer = (params.referrer || '').toLowerCase().trim();
  const hasGclid = Boolean(params.gclid);
  const hasFbclid = Boolean(params.fbclid);
  const hasMsclkid = Boolean(params.msclkid);

  const isPaidMedium =
    /^(cpc|ppc|paid|paid_social|paidsocial|paid_video|paid_search|ads|ad|display|sponsor|meta|ig_paid)$/i.test(
      medium
    ) ||
    medium.includes('paid') ||
    medium.includes('cpc') ||
    medium.includes('ads');

  // 1. YouTube
  if (source.includes('youtube') || referrer.includes('youtube.com') || referrer.includes('youtu.be')) {
    if (isPaidMedium || hasGclid) {
      return 'YouTube Paid';
    }
    return 'YouTube Organic';
  }

  // 2. Instagram
  if (
    source.includes('instagram') ||
    source.includes('ig') ||
    referrer.includes('instagram.com') ||
    referrer.includes('l.instagram.com')
  ) {
    if (isPaidMedium || source.includes('paid') || source === 'ig_paid') {
      return 'Instagram Paid';
    }
    return 'Instagram Organic';
  }

  // 3. Facebook
  if (
    source.includes('facebook') ||
    source.includes('fb') ||
    hasFbclid ||
    referrer.includes('facebook.com') ||
    referrer.includes('fb.me') ||
    referrer.includes('l.facebook.com')
  ) {
    if (isPaidMedium || source.includes('paid') || hasFbclid) {
      return 'Facebook Paid';
    }
    return 'Facebook Organic';
  }

  // 4. Google Ads / Search
  if (source.includes('google') || hasGclid) {
    if (isPaidMedium || hasGclid || medium.includes('cpc') || medium.includes('ads')) {
      return 'Google Ads';
    }
    return 'Google Organic';
  }

  // 5. Bing Search / Ads
  if (source.includes('bing') || hasMsclkid || referrer.includes('bing.com')) {
    return 'Bing Search';
  }

  // 6. DuckDuckGo Search
  if (source.includes('duckduckgo') || referrer.includes('duckduckgo.com')) {
    return 'DuckDuckGo Search';
  }

  // 7. ChatGPT / AI Search Assistants
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

  // 8. Messaging Channels (WhatsApp, Email)
  if (source.includes('whatsapp') || medium.includes('whatsapp') || referrer.includes('whatsapp.com')) {
    return 'WhatsApp';
  }
  if (
    source.includes('email') ||
    source.includes('newsletter') ||
    medium.includes('email') ||
    medium.includes('newsletter')
  ) {
    return 'Email';
  }

  // 9. Referrer checks if no specific marketing source tag matched
  if (!source) {
    if (referrer) {
      if (referrer.includes('google.')) {
        return 'Google Organic';
      }
      if (referrer.includes('bing.')) {
        return 'Bing Search';
      }
      if (referrer.includes('duckduckgo.')) {
        return 'DuckDuckGo Search';
      }
      if (referrer.includes('yahoo.')) {
        return 'Other';
      }

      // External website referrer check
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
 * Disambiguates direct traffic strictly without guessing
 */
export function classifyDirectTraffic(params: {
  hasPriorTouches?: boolean;
  referrer?: string | null;
  isAppWebview?: boolean;
  hasMarketingParams?: boolean;
}): 'Genuine Direct' | 'Direct (Previously Attributed)' | 'Unknown / Referrer Missing' {
  if (params.hasMarketingParams) {
    return 'Genuine Direct';
  }
  if (params.hasPriorTouches) {
    return 'Direct (Previously Attributed)';
  }
  if (params.isAppWebview || params.referrer === '') {
    if (params.isAppWebview) return 'Unknown / Referrer Missing';
    return 'Genuine Direct';
  }
  return 'Genuine Direct';
}

/**
 * Computes attribution data confidence level and human-readable explanation
 */
export function calculateConfidence(params: {
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
}): ConfidenceResult {
  const hasClickId = Boolean(params.gclid || params.fbclid);
  const hasCampaign = Boolean(params.utm_source && (params.utm_campaign || params.utm_content));

  if (hasClickId || hasCampaign) {
    return {
      level: 'high',
      reason: 'Explicit campaign UTM tags or verified platform click ID present.',
    };
  }

  if (params.referrer && params.referrer.startsWith('http')) {
    return {
      level: 'medium',
      reason: 'Identified via referring website domain without explicit campaign tags.',
    };
  }

  return {
    level: 'low',
    reason: 'Direct navigation or missing referrer; no marketing parameters provided.',
  };
}

/**
 * Resolves content and campaign IDs to friendly human readable names using the registry
 */
export function resolveContentNames(
  target: {
    campaign_id?: string | null;
    content_id?: string | null;
    source?: string | null;
    campaign?: string | null;
    content?: string | null;
  },
  registry?: RegistryMapping[] | null
): {
  campaign_name: string | null;
  content_name: string | null;
  ad_or_video_name: string | null;
  adset_name: string | null;
} {
  if (!registry || registry.length === 0) {
    return {
      campaign_name: target.campaign || target.campaign_id || null,
      content_name: target.content || target.content_id || null,
      ad_or_video_name: target.content || target.content_id || null,
      adset_name: null,
    };
  }

  const match = registry.find((r) => {
    if (target.content_id && (r.content_id === target.content_id || r.ad_or_video_id === target.content_id)) {
      return true;
    }
    if (target.campaign_id && r.campaign_id === target.campaign_id) {
      return true;
    }
    return false;
  });

  if (match) {
    return {
      campaign_name: match.campaign_name || target.campaign || target.campaign_id || null,
      content_name: match.content_name || match.ad_or_video_name || target.content || target.content_id || null,
      ad_or_video_name: match.ad_or_video_name || target.content || target.content_id || null,
      adset_name: match.adset_name || null,
    };
  }

  return {
    campaign_name: target.campaign || target.campaign_id || null,
    content_name: target.content || target.content_id || null,
    ad_or_video_name: target.content || target.content_id || null,
    adset_name: null,
  };
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
export function recordProductView(slug: string, productName?: string, productId?: string): AttributionData | null {
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
      product_name: current.firstTouch.product_name || productName || null,
      product_id: current.firstTouch.product_id || productId || null,
    },
    lastTouch: {
      ...current.lastTouch,
      productViewed: cleanSlug,
      product_name: productName || null,
      product_id: productId || null,
    },
  };

  setStoredAttribution(updated);
  return updated;
}

export interface CaptureOptions {
  url?: string;
  referrer?: string;
  pathname?: string;
  eventType?: EventType;
}

/**
 * Captures current page touchpoint, updates last touch, and preserves immutable first touch
 */
export function captureAttribution(options?: CaptureOptions): AttributionData | null {
  if (typeof window === 'undefined' && !options?.url) return null;

  const urlStr = options?.url || (typeof window !== 'undefined' ? window.location.href : '/');
  const referrerStr =
    options?.referrer !== undefined ? options.referrer : typeof document !== 'undefined' ? document.referrer : '';

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
  const utm_id = searchParams.get('utm_id');
  const gclid = searchParams.get('gclid');
  const fbclid = searchParams.get('fbclid');
  const dclid = searchParams.get('dclid');
  const msclkid = searchParams.get('msclkid');
  const ttclid = searchParams.get('ttclid');

  const normalized = normalizeSource({
    utm_source,
    utm_medium,
    utm_campaign,
    referrer: referrerStr,
    gclid,
    fbclid,
    dclid,
    msclkid,
    ttclid,
  });

  const confidence = calculateConfidence({
    utm_source,
    utm_campaign,
    utm_content,
    gclid,
    fbclid,
    referrer: referrerStr,
  });

  const env = detectClientEnvironment();
  const nowIso = new Date().toISOString();
  const refDomain = extractReferrerDomain(referrerStr);
  const sessionId = getOrCreateSessionId();

  const hasMarketingParams = Boolean(
    utm_source || utm_campaign || utm_medium || utm_id || gclid || fbclid || dclid || msclkid || ttclid
  );
  const isExternalReferrer = Boolean(
    referrerStr &&
      !referrerStr.includes('celite.in') &&
      !referrerStr.includes('localhost') &&
      !referrerStr.includes('127.0.0.1')
  );

  const existing = getStoredAttribution();

  let finalSource = normalized;
  if (normalized === 'Direct') {
    finalSource = classifyDirectTraffic({
      hasPriorTouches: Boolean(existing),
      referrer: referrerStr,
      hasMarketingParams,
    });
  }

  const newTouchPoint: TouchPoint = {
    source: finalSource,
    medium: truncate(utm_medium),
    campaign: truncate(utm_campaign),
    campaign_id: truncate(utm_id),
    content: truncate(utm_content),
    content_id: truncate(utm_content),
    term: truncate(utm_term),
    landingPage: truncate(fullPath) || '/',
    referrer: truncate(referrerStr),
    referrerDomain: truncate(refDomain),
    gclid: truncate(gclid),
    fbclid: truncate(fbclid),
    dclid: truncate(dclid),
    msclkid: truncate(msclkid),
    ttclid: truncate(ttclid),
    utm_id: truncate(utm_id),
    device: env.device,
    browser: env.browser,
    os: env.os,
    confidence: confidence.level,
    confidence_reason: confidence.reason,
    timestamp: nowIso,
  };

  if (!existing) {
    // First visit for this browser profile: initialize first and last touch
    const initialData: AttributionData = {
      anonymousId: generateAnonymousId(),
      sessionId,
      firstTouch: newTouchPoint,
      lastTouch: newTouchPoint,
      touchCount: 1,
    };
    setStoredAttribution(initialData);
    return initialData;
  }

  // If returning visit brings new marketing parameters or comes from an external referrer, update last touch
  if (hasMarketingParams || isExternalReferrer) {
    const updatedData: AttributionData = {
      ...existing,
      sessionId,
      lastTouch: {
        ...newTouchPoint,
        productViewed: existing.lastTouch?.productViewed || existing.firstTouch?.productViewed || null,
        product_name: existing.lastTouch?.product_name || existing.firstTouch?.product_name || null,
        product_id: existing.lastTouch?.product_id || existing.firstTouch?.product_id || null,
      },
      touchCount: (existing.touchCount || 1) + 1,
    };
    setStoredAttribution(updatedData);
    return updatedData;
  }

  return existing;
}

export interface AttributionSummary {
  totalSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  monthlyCount: number;
  yearlyCount: number;
  avgOrderValue: number;
}

export interface SourceMetric {
  source: string;
  customers: number;
  revenue: number;
  monthly: number;
  yearly: number;
  avgOrderValue: number;
}

export interface AssistedConversionMetric {
  firstSource: string;
  lastSource: string;
  path: string;
  count: number;
  revenue: number;
}

export interface AttributionMetricsResult {
  summary: AttributionSummary;
  firstTouchBreakdown: SourceMetric[];
  lastTouchBreakdown: SourceMetric[];
  assistedConversions: AssistedConversionMetric[];
  campaignBreakdown: Array<{
    campaign: string;
    source: string;
    customers: number;
    revenue: number;
    monthly: number;
    yearly: number;
    avgOrderValue: number;
  }>;
  productBreakdown: Array<{
    product: string;
    subscriptions: number;
    revenue: number;
  }>;
}

/**
 * Aggregates multi-touch subscription records into reports
 */
export function aggregateAttributionMetrics(records: any[]): AttributionMetricsResult {
  let totalRevenue = 0;
  let monthlyRevenue = 0;
  let yearlyRevenue = 0;
  let monthlyCount = 0;
  let yearlyCount = 0;

  const firstSourceMap: Record<string, { source: string; customers: number; revenue: number; monthly: number; yearly: number }> = {};
  const lastSourceMap: Record<string, { source: string; customers: number; revenue: number; monthly: number; yearly: number }> = {};
  const campaignMap: Record<string, { campaign: string; source: string; customers: number; revenue: number; monthly: number; yearly: number }> = {};
  const productMap: Record<string, { product: string; subscriptions: number; revenue: number }> = {};
  const assistedMap: Record<string, { firstSource: string; lastSource: string; path: string; count: number; revenue: number }> = {};

  records.forEach((r) => {
    const amt = Number(r.amount || 0);
    totalRevenue += amt;
    const plan = (r.subscription_plan || '').toLowerCase();
    const isYearly = plan === 'yearly';

    if (isYearly) {
      yearlyRevenue += amt;
      yearlyCount += 1;
    } else {
      monthlyRevenue += amt;
      monthlyCount += 1;
    }

    const fSource = r.first_source || 'Direct';
    const lSource = r.last_source || fSource || 'Direct';

    // First Touch
    if (!firstSourceMap[fSource]) {
      firstSourceMap[fSource] = { source: fSource, customers: 0, revenue: 0, monthly: 0, yearly: 0 };
    }
    firstSourceMap[fSource].customers += 1;
    firstSourceMap[fSource].revenue += amt;
    if (isYearly) firstSourceMap[fSource].yearly += 1;
    else firstSourceMap[fSource].monthly += 1;

    // Last Touch
    if (!lastSourceMap[lSource]) {
      lastSourceMap[lSource] = { source: lSource, customers: 0, revenue: 0, monthly: 0, yearly: 0 };
    }
    lastSourceMap[lSource].customers += 1;
    lastSourceMap[lSource].revenue += amt;
    if (isYearly) lastSourceMap[lSource].yearly += 1;
    else lastSourceMap[lSource].monthly += 1;

    // Campaign
    const camp = r.first_campaign || r.last_campaign;
    if (camp) {
      if (!campaignMap[camp]) {
        campaignMap[camp] = {
          campaign: camp,
          source: r.first_source || r.last_source || 'Other',
          customers: 0,
          revenue: 0,
          monthly: 0,
          yearly: 0,
        };
      }
      campaignMap[camp].customers += 1;
      campaignMap[camp].revenue += amt;
      if (isYearly) campaignMap[camp].yearly += 1;
      else campaignMap[camp].monthly += 1;
    }

    // Product
    const prod = r.first_product_viewed || r.last_product_viewed;
    if (prod) {
      if (!productMap[prod]) {
        productMap[prod] = { product: prod, subscriptions: 0, revenue: 0 };
      }
      productMap[prod].subscriptions += 1;
      productMap[prod].revenue += amt;
    }

    // Assisted Conversions (First touch != Last touch)
    if (fSource !== lSource) {
      const pathKey = `${fSource} → ${lSource}`;
      if (!assistedMap[pathKey]) {
        assistedMap[pathKey] = {
          firstSource: fSource,
          lastSource: lSource,
          path: pathKey,
          count: 0,
          revenue: 0,
        };
      }
      assistedMap[pathKey].count += 1;
      assistedMap[pathKey].revenue += amt;
    }
  });

  const totalSubscriptions = records.length;
  const avgOrderValue = totalSubscriptions > 0 ? Math.round(totalRevenue / totalSubscriptions) : 0;

  const firstTouchBreakdown = Object.values(firstSourceMap)
    .map((s) => ({
      ...s,
      avgOrderValue: s.customers > 0 ? Math.round(s.revenue / s.customers) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const lastTouchBreakdown = Object.values(lastSourceMap)
    .map((s) => ({
      ...s,
      avgOrderValue: s.customers > 0 ? Math.round(s.revenue / s.customers) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const campaignBreakdown = Object.values(campaignMap)
    .map((c) => ({
      ...c,
      avgOrderValue: c.customers > 0 ? Math.round(c.revenue / c.customers) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const productBreakdown = Object.values(productMap).sort((a, b) => b.subscriptions - a.subscriptions);
  const assistedConversions = Object.values(assistedMap).sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalSubscriptions,
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      monthlyCount,
      yearlyCount,
      avgOrderValue,
    },
    firstTouchBreakdown,
    lastTouchBreakdown,
    assistedConversions,
    campaignBreakdown,
    productBreakdown,
  };
}

/**
 * Formats a single subscription attribution record into a CSV row
 */
export function formatAttributionCsvRow(record: any): string {
  const escape = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  return [
    escape(record.id || ''),
    escape(record.user_id || ''),
    escape(record.subscription_plan || ''),
    escape(record.amount || 0),
    escape(record.currency || 'INR'),
    escape(record.first_source || ''),
    escape(record.first_medium || ''),
    escape(record.first_campaign || ''),
    escape(record.first_content || ''),
    escape(record.first_landing_page || ''),
    escape(record.first_product_viewed || ''),
    escape(record.last_source || ''),
    escape(record.last_medium || ''),
    escape(record.last_campaign || ''),
    escape(record.last_content || ''),
    escape(record.last_landing_page || ''),
    escape(record.last_product_viewed || ''),
    escape(record.journey_touch_count || record.touch_count || 1),
    escape(record.confidence_level || 'medium'),
    escape(record.created_at || ''),
  ].join(',');
}
