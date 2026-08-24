// agent-notes: { ctx: "TDD test suite for subscription pricing transition from 499 to 799 and legacy autopay preservation", deps: ["vitest", "lib/supabaseAdmin.ts", "app/api/razorpay/webhook/route.ts"], state: active, last: "tara@2026-08-24" }

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Setup Supabase Mock
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

let mockSubscriptionsData: any = null;
let mockSettingsData: any = [
  { key: 'RAZORPAY_WEBHOOK_SECRET', value: 'test_webhook_secret_123' },
  { key: 'RAZORPAY_KEY_ID', value: 'rzp_test_key' },
  { key: 'RAZORPAY_KEY_SECRET', value: 'rzp_test_secret' },
  { key: 'RAZORPAY_MONTHLY_AMOUNT', value: '79900' },
  { key: 'RAZORPAY_YEARLY_AMOUNT', value: '549900' },
];

function createChainableMock(resolvedData: any = null) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn((data: any) => {
    mockUpdate(data);
    return chain;
  });
  chain.insert = vi.fn((data: any) => {
    mockInsert(data);
    return chain;
  });
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: resolvedData, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error: null });
  chain.then = (resolve: any) => Promise.resolve({ data: resolvedData, error: null }).then(resolve);
  return chain;
}

const mockAdmin = {
  from: vi.fn((table: string) => {
    if (table === 'settings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockSettingsData, error: null }),
          then: (resolve: any) => Promise.resolve({ data: mockSettingsData, error: null }).then(resolve),
        }),
      };
    }
    if (table === 'subscriptions') {
      return createChainableMock(mockSubscriptionsData);
    }
    return createChainableMock(null);
  }),
};

vi.mock('../lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

import { POST as webhookHandler } from '../app/api/razorpay/webhook/route';
import { getRazorpayCreds } from '../lib/razorpay';
import { paiseToINR } from '../lib/priceUtils';

describe('Subscription Pricing & Offer Transition (499 -> 799)', () => {
  const secret = 'test_webhook_secret_123';

  function createSignedRequest(bodyObj: any) {
    const rawBody = JSON.stringify(bodyObj);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return new Request('http://localhost:3000/api/razorpay/webhook', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
        'content-type': 'application/json',
      },
      body: rawBody,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionsData = null;
    mockSettingsData = [
      { key: 'RAZORPAY_WEBHOOK_SECRET', value: 'test_webhook_secret_123' },
      { key: 'RAZORPAY_KEY_ID', value: 'rzp_test_key' },
      { key: 'RAZORPAY_KEY_SECRET', value: 'rzp_test_secret' },
      { key: 'RAZORPAY_MONTHLY_AMOUNT', value: '79900' },
      { key: 'RAZORPAY_YEARLY_AMOUNT', value: '549900' },
    ];
  });

  describe('Database Price Resolution', () => {
    it('resolves active monthly subscription price as 79900 paise (₹799)', async () => {
      const creds = await getRazorpayCreds();
      expect(creds.monthly_amount).toBe(79900);
      expect(paiseToINR(creds.monthly_amount)).toBe(799);
    });

    it('calculates yearly savings against ₹799 monthly (₹9,588/yr vs ₹5,499/yr = ₹4,089 savings)', () => {
      const monthly = 799;
      const yearly = 5499;
      const annualMonthlyTotal = monthly * 12; // 9588
      const savings = annualMonthlyTotal - yearly;
      expect(annualMonthlyTotal).toBe(9588);
      expect(savings).toBe(4089);
    });
  });

  describe('Legacy ₹499 Autopay User Handling', () => {
    it('seamlessly renews legacy 499 subscriber without altering active subscription or plan', async () => {
      const futureEndSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      // Existing subscriber who subscribed at ₹499 with autopay
      mockSubscriptionsData = {
        user_id: 'legacy_499_user_1',
        plan: 'monthly',
        is_active: true,
        autopay_enabled: true,
        razorpay_subscription_id: 'sub_legacy_499_id',
        valid_until: new Date().toISOString(),
      };

      const payload = {
        event: 'invoice.payment_succeeded',
        payload: {
          invoice: {
            entity: {
              id: 'inv_legacy_499_001',
              subscription_id: 'sub_legacy_499_id',
              amount_paid: 49900, // Debited ₹499 by Razorpay on legacy plan
              period_end: futureEndSeconds,
              notes: { user_id: 'legacy_499_user_1', plan: 'monthly' },
            },
          },
          subscription: {
            entity: {
              id: 'sub_legacy_499_id',
              current_end: futureEndSeconds,
            },
          },
        },
      };

      const req = createSignedRequest(payload);
      const res = await webhookHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');

      // Check update was called with active status and monthly plan intact
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
          plan: 'monthly',
          autopay_enabled: true,
        })
      );
    });
  });

  describe('Cancelled User Re-subscribing at ₹799', () => {
    it('reactivates cancelled subscription when new subscription is created on current ₹799 plan', async () => {
      const futureEndSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      // User had cancelled their previous subscription
      mockSubscriptionsData = {
        user_id: 'cancelled_user_789',
        plan: 'monthly',
        is_active: false,
        autopay_enabled: false,
        razorpay_subscription_id: 'sub_old_cancelled_id',
      };

      // User re-subscribes via checkout -> gets new Razorpay subscription ID on ₹799 plan
      const payload = {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              id: 'sub_new_799_id',
              plan_id: 'plan_monthly_799',
              current_end: futureEndSeconds,
              notes: { user_id: 'cancelled_user_789', plan: 'monthly' },
            },
          },
        },
      };

      const req = createSignedRequest(payload);
      const res = await webhookHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');

      // Check that subscription is updated with new subscription id and activated
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
          plan: 'monthly',
          autopay_enabled: true,
          razorpay_subscription_id: 'sub_new_799_id',
        })
      );
    });
  });
});
