// agent-notes: { ctx: "Unit tests for Traffic Analytics API route", deps: ["vitest", "app/api/admin/analytics/traffic/route"], state: active, last: "sato@2026-08-14" }
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVisitorsData = [
  {
    id: 'vis-1',
    user_id: 'user-1',
    anonymous_id: 'anon-1',
    first_source: 'Instagram Organic',
    first_medium: 'social',
    first_campaign: 'august_reels',
    first_landing_page: '/product/wedding-template',
    first_referrer: 'https://l.instagram.com/',
    first_product_viewed: 'wedding-template',
    first_visit_at: '2026-08-14T10:00:00.000Z',
    last_source: 'Google Organic',
    last_medium: 'organic',
    last_campaign: null,
    last_landing_page: '/checkout?subscription=monthly',
    last_referrer: 'https://www.google.com/',
    last_product_viewed: 'wedding-template',
    last_visit_at: '2026-08-14T11:00:00.000Z',
    created_at: '2026-08-14T10:00:00.000Z',
  },
  {
    id: 'vis-2',
    user_id: 'user-2',
    anonymous_id: 'anon-2',
    first_source: 'Direct',
    first_medium: null,
    first_campaign: null,
    first_landing_page: '/',
    first_referrer: null,
    first_product_viewed: null,
    first_visit_at: '2026-08-14T12:00:00.000Z',
    last_source: 'Direct',
    last_medium: null,
    last_campaign: null,
    last_landing_page: '/',
    last_referrer: null,
    last_product_viewed: null,
    last_visit_at: '2026-08-14T12:00:00.000Z',
    created_at: '2026-08-14T12:00:00.000Z',
  },
];

const mockSubscriptions = [
  {
    user_id: 'user-1',
    plan: 'monthly',
    is_active: true,
    created_at: '2026-08-14T10:30:00.000Z',
  },
];

const mockSubAttributions = [
  {
    user_id: 'user-1',
    subscription_plan: 'monthly',
  },
];

const mockOrders: Record<string, unknown>[] = [];

function createChainableMock(table: string) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: { user_id: 'admin-123' }, error: null });

  chain.then = (resolve: (val: unknown) => void) => {
    if (table === 'visitor_attributions') {
      return Promise.resolve({ data: mockVisitorsData, error: null }).then(resolve);
    }
    if (table === 'subscription_attributions') {
      return Promise.resolve({ data: mockSubAttributions, error: null }).then(resolve);
    }
    if (table === 'subscriptions') {
      return Promise.resolve({ data: mockSubscriptions, error: null }).then(resolve);
    }
    if (table === 'orders') {
      return Promise.resolve({ data: mockOrders, error: null }).then(resolve);
    }
    return Promise.resolve({ data: [], error: null }).then(resolve);
  };
  return chain;
}

const mockAdmin = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-123' } }, error: null }),
  },
  from: vi.fn((table: string) => {
    if (table === 'admins') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'admin-123' } }),
          }),
        }),
      };
    }
    return createChainableMock(table);
  }),
};

vi.mock('../lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

describe('Traffic Analytics API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates visitor attributions, source shares, and conversions correctly', async () => {
    const { GET } = await import('../app/api/admin/analytics/traffic/route');

    const req = new Request('http://localhost:3000/api/admin/analytics/traffic', {
      headers: {
        authorization: 'Bearer valid-admin-token',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.summary.totalVisitors).toBe(2);
    expect(json.data.summary.totalConverted).toBe(1);
    expect(json.data.summary.overallConversionRate).toBe(50);
    expect(json.data.summary.multiTouchCount).toBe(1);
    expect(json.data.sources.length).toBeGreaterThan(0);
    expect(json.data.visitorLogs.length).toBe(2);
  });
});
