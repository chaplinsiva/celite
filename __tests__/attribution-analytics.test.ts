// agent-notes: { ctx: "Unit & integration tests for Attribution Analytics API route", deps: ["vitest", "app/api/admin/analytics/attribution/route"], state: active, last: "sato@2026-08-14" }
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAttributionsData = [
  {
    id: 'attr-1',
    user_id: 'user-1',
    subscription_plan: 'monthly',
    amount: 799,
    first_source: 'Instagram Paid',
    first_campaign: 'august_ads',
    first_product_viewed: 'jana-nayagan-title-card',
    last_source: 'Google Organic',
    created_at: new Date().toISOString(),
  },
  {
    id: 'attr-2',
    user_id: 'user-2',
    subscription_plan: 'yearly',
    amount: 5499,
    first_source: 'Instagram Paid',
    first_campaign: 'august_ads',
    first_product_viewed: 'jana-nayagan-title-card',
    last_source: 'Instagram Paid',
    created_at: new Date().toISOString(),
  },
  {
    id: 'attr-3',
    user_id: 'user-3',
    subscription_plan: 'monthly',
    amount: 799,
    first_source: 'Google Organic',
    first_campaign: null,
    first_product_viewed: 'wedding-slideshow',
    last_source: 'Direct',
    created_at: new Date().toISOString(),
  },
];

function createChainableMock(resolvedData: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: { user_id: 'admin-123' }, error: null });
  chain.then = (resolve: any) => Promise.resolve({ data: resolvedData, error: null }).then(resolve);
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
            maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'admin-123' }, error: null }),
          }),
        }),
      };
    }
    if (table === 'subscription_attributions') {
      return createChainableMock(mockAttributionsData);
    }
    return createChainableMock([]);
  }),
};

vi.mock('../lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

import { GET } from '../app/api/admin/analytics/attribution/route';

describe('Attribution Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly calculates summary metrics, source breakdown, and assisted conversions', async () => {
    const req = new Request('http://localhost:3000/api/admin/analytics/attribution', {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid_admin_token',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);

    // Summary
    expect(json.summary.totalSubscriptions).toBe(3);
    expect(json.summary.totalRevenue).toBe(799 + 5499 + 799);
    expect(json.summary.monthlyCount).toBe(2);
    expect(json.summary.yearlyCount).toBe(1);

    // First Touch Source Breakdown
    const igPaidFirst = json.firstTouchBreakdown.find((s: any) => s.source === 'Instagram Paid');
    expect(igPaidFirst).toBeDefined();
    expect(igPaidFirst.customers).toBe(2);
    expect(igPaidFirst.revenue).toBe(799 + 5499);

    // Campaign Breakdown
    const augCampaign = json.campaignBreakdown.find((c: any) => c.campaign === 'august_ads');
    expect(augCampaign).toBeDefined();
    expect(augCampaign.customers).toBe(2);
    expect(augCampaign.revenue).toBe(6298);

    // Product Breakdown
    const janaProduct = json.productBreakdown.find((p: any) => p.product === 'jana-nayagan-title-card');
    expect(janaProduct).toBeDefined();
    expect(janaProduct.subscriptions).toBe(2);

    // Assisted Conversions (attr-1: Instagram Paid -> Google Organic, attr-3: Google Organic -> Direct)
    expect(json.assistedConversions.length).toBe(2);
    const igToGoogle = json.assistedConversions.find(
      (a: any) => a.path === 'Instagram Paid → Google Organic'
    );
    expect(igToGoogle).toBeDefined();
    expect(igToGoogle.count).toBe(1);
  });
});
