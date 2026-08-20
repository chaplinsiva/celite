// agent-notes: { ctx: "Unit tests for Live Traffic & All-Visitor Activity Logs aggregation & 5-hour TTL pruning logic", deps: ["vitest"], state: active, last: "tara@2026-08-20" }
import { describe, it, expect } from 'vitest';

export type MockTouchpoint = {
  id: string;
  anonymous_id: string;
  session_id: string;
  user_id: string | null;
  event_type: string;
  source: string;
  medium: string | null;
  campaign: string | null;
  path: string;
  product_slug: string | null;
  device_type: string | null;
  browser: string | null;
  created_at: string;
};

export function filterRecentTouchpoints(
  touchpoints: MockTouchpoint[],
  maxHours = 5,
  referenceTime = new Date()
): MockTouchpoint[] {
  const cutoffTime = new Date(referenceTime.getTime() - maxHours * 60 * 60 * 1000).toISOString();
  return touchpoints.filter((t) => t.created_at >= cutoffTime);
}

export function computeLiveTrafficMetrics(touchpoints: MockTouchpoint[]) {
  const totalViews = touchpoints.length;
  const uniqueAnonymous = new Set(touchpoints.map((t) => t.anonymous_id).filter(Boolean)).size;
  const uniqueSessions = new Set(touchpoints.map((t) => t.session_id).filter(Boolean)).size;
  const uniqueUsers = new Set(touchpoints.map((t) => t.user_id).filter(Boolean)).size;

  let productViewsCount = 0;
  let signupsCount = 0;
  let checkoutStartsCount = 0;
  let subscriptionsCount = 0;

  const sourceMap: Record<
    string,
    { source: string; views: number; uniqueVisitors: Set<string>; signups: number; checkouts: number; subscriptions: number }
  > = {};

  const pageMap: Record<string, { path: string; views: number }> = {};
  const productMap: Record<string, { product: string; views: number }> = {};
  const deviceMap: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };

  touchpoints.forEach((t) => {
    if (t.event_type === 'product_view' || Boolean(t.product_slug)) productViewsCount += 1;
    if (t.event_type === 'signup') signupsCount += 1;
    if (t.event_type === 'checkout_started') checkoutStartsCount += 1;
    if (t.event_type === 'subscription_created') subscriptionsCount += 1;

    // Source breakdown
    const src = t.source || 'Direct';
    if (!sourceMap[src]) {
      sourceMap[src] = {
        source: src,
        views: 0,
        uniqueVisitors: new Set(),
        signups: 0,
        checkouts: 0,
        subscriptions: 0,
      };
    }
    sourceMap[src].views += 1;
    if (t.anonymous_id) sourceMap[src].uniqueVisitors.add(t.anonymous_id);
    if (t.event_type === 'signup') sourceMap[src].signups += 1;
    if (t.event_type === 'checkout_started') sourceMap[src].checkouts += 1;
    if (t.event_type === 'subscription_created') sourceMap[src].subscriptions += 1;

    // Pages
    const p = t.path || '/';
    if (!pageMap[p]) pageMap[p] = { path: p, views: 0 };
    pageMap[p].views += 1;

    // Products
    if (t.product_slug) {
      if (!productMap[t.product_slug]) productMap[t.product_slug] = { product: t.product_slug, views: 0 };
      productMap[t.product_slug].views += 1;
    }

    // Devices
    const dev = t.device_type || 'Desktop';
    deviceMap[dev] = (deviceMap[dev] || 0) + 1;
  });

  const sourcesBreakdown = Object.values(sourceMap).map((s) => ({
    source: s.source,
    views: s.views,
    uniqueVisitors: s.uniqueVisitors.size,
    signups: s.signups,
    checkouts: s.checkouts,
    subscriptions: s.subscriptions,
    signupRate: s.views > 0 ? Math.round((s.signups / s.views) * 1000) / 10 : 0,
  })).sort((a, b) => b.views - a.views);

  return {
    summary: {
      totalViews,
      uniqueAnonymous,
      uniqueSessions,
      uniqueUsers,
      productViewsCount,
      signupsCount,
      checkoutStartsCount,
      subscriptionsCount,
    },
    sourcesBreakdown,
    topPages: Object.values(pageMap).sort((a, b) => b.views - a.views),
    topProducts: Object.values(productMap).sort((a, b) => b.views - a.views),
    deviceBreakdown: deviceMap,
  };
}

describe('Live Traffic & Visitor Activity Logs Aggregation', () => {
  const mockEvents: MockTouchpoint[] = [
    {
      id: '1',
      anonymous_id: 'anon-1',
      session_id: 'sess-1',
      user_id: null,
      event_type: 'landing',
      source: 'Instagram Paid',
      medium: 'paid_social',
      campaign: 'august_video_editors',
      path: '/',
      product_slug: null,
      device_type: 'Mobile',
      browser: 'Chrome',
      created_at: '2026-08-16T10:00:00Z',
    },
    {
      id: '2',
      anonymous_id: 'anon-1',
      session_id: 'sess-1',
      user_id: null,
      event_type: 'product_view',
      source: 'Instagram Paid',
      medium: 'paid_social',
      campaign: 'august_video_editors',
      path: '/product/dc-blood-band',
      product_slug: 'dc-blood-band',
      device_type: 'Mobile',
      browser: 'Chrome',
      created_at: '2026-08-16T10:02:00Z',
    },
    {
      id: '3',
      anonymous_id: 'anon-1',
      session_id: 'sess-1',
      user_id: 'user-1',
      event_type: 'signup',
      source: 'Instagram Paid',
      medium: 'paid_social',
      campaign: 'august_video_editors',
      path: '/signup',
      product_slug: null,
      device_type: 'Mobile',
      browser: 'Chrome',
      created_at: '2026-08-16T10:05:00Z',
    },
    {
      id: '4',
      anonymous_id: 'anon-2',
      session_id: 'sess-2',
      user_id: null,
      event_type: 'landing',
      source: 'Google Organic',
      medium: 'organic',
      campaign: null,
      path: '/templates',
      product_slug: null,
      device_type: 'Desktop',
      browser: 'Safari',
      created_at: '2026-08-16T10:10:00Z',
    },
  ];

  it('correctly aggregates total views, unique visitors, sessions, and signups', () => {
    const result = computeLiveTrafficMetrics(mockEvents);

    expect(result.summary.totalViews).toBe(4);
    expect(result.summary.uniqueAnonymous).toBe(2);
    expect(result.summary.uniqueSessions).toBe(2);
    expect(result.summary.signupsCount).toBe(1);
    expect(result.summary.productViewsCount).toBe(1);
  });

  it('correctly attributes views and signups to the exact marketing source', () => {
    const result = computeLiveTrafficMetrics(mockEvents);

    const ig = result.sourcesBreakdown.find((s) => s.source === 'Instagram Paid');
    expect(ig?.views).toBe(3);
    expect(ig?.uniqueVisitors).toBe(1);
    expect(ig?.signups).toBe(1);

    const google = result.sourcesBreakdown.find((s) => s.source === 'Google Organic');
    expect(google?.views).toBe(1);
    expect(google?.signups).toBe(0);
  });

  it('computes device distribution accurately', () => {
    const result = computeLiveTrafficMetrics(mockEvents);

    expect(result.deviceBreakdown.Mobile).toBe(3);
    expect(result.deviceBreakdown.Desktop).toBe(1);
  });

  describe('5-hour TTL Log Retention & Pruning', () => {
    it('prunes and excludes events older than 5 hours', () => {
      const now = new Date('2026-08-16T12:00:00Z');
      const eventsWithStale: MockTouchpoint[] = [
        {
          id: 'fresh-1',
          anonymous_id: 'anon-1',
          session_id: 'sess-1',
          user_id: null,
          event_type: 'landing',
          source: 'Instagram Paid',
          medium: 'cpc',
          campaign: 'celite_august_sale',
          path: '/',
          product_slug: null,
          device_type: 'Mobile',
          browser: 'Chrome',
          created_at: '2026-08-16T11:00:00Z', // 1 hour ago
        },
        {
          id: 'fresh-2',
          anonymous_id: 'anon-2',
          session_id: 'sess-2',
          user_id: null,
          event_type: 'product_view',
          source: 'Google Organic',
          medium: 'organic',
          campaign: null,
          path: '/templates/wedding-invitation',
          product_slug: 'wedding-invitation',
          device_type: 'Desktop',
          browser: 'Safari',
          created_at: '2026-08-16T08:30:00Z', // 3.5 hours ago
        },
        {
          id: 'stale-1',
          anonymous_id: 'anon-old-1',
          session_id: 'sess-old-1',
          user_id: null,
          event_type: 'landing',
          source: 'Facebook Paid',
          medium: 'cpc',
          campaign: 'old_campaign',
          path: '/',
          product_slug: null,
          device_type: 'Mobile',
          browser: 'Chrome',
          created_at: '2026-08-16T06:00:00Z', // 6 hours ago (STALE)
        },
        {
          id: 'stale-2',
          anonymous_id: 'anon-old-2',
          session_id: 'sess-old-2',
          user_id: null,
          event_type: 'landing',
          source: 'YouTube Organic',
          medium: 'video',
          campaign: null,
          path: '/',
          product_slug: null,
          device_type: 'Desktop',
          browser: 'Firefox',
          created_at: '2026-08-15T12:00:00Z', // 24 hours ago (STALE)
        },
      ];

      const retained = filterRecentTouchpoints(eventsWithStale, 5, now);
      expect(retained.length).toBe(2);
      expect(retained.map((e) => e.id)).toEqual(['fresh-1', 'fresh-2']);
      expect(retained.some((e) => e.id === 'stale-1' || e.id === 'stale-2')).toBe(false);
    });
  });
});
