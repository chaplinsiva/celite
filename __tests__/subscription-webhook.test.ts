// agent-notes: ctx="Unit and integration tests for Razorpay subscription payment & autopay webhooks", deps="vitest, app/api/razorpay/webhook/route, lib/supabaseAdmin", state="active", last="vteam@2026-08-02"
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Setup Supabase Mock
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

let mockSubscriptionsData: any = null;

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
        select: vi.fn().mockResolvedValue({
          data: [
            { key: 'RAZORPAY_WEBHOOK_SECRET', value: 'test_webhook_secret_123' },
            { key: 'RAZORPAY_KEY_ID', value: 'rzp_test_key' },
            { key: 'RAZORPAY_KEY_SECRET', value: 'rzp_test_secret' },
          ],
          error: null,
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

// Import Webhook Handler
import { POST } from '../app/api/razorpay/webhook/route';

describe('Subscription & Autopay Webhook Handler', () => {
  const secret = 'test_webhook_secret_123';

  function createSignedRequest(bodyObj: any, headerSecret: string = secret) {
    const rawBody = JSON.stringify(bodyObj);
    const signature = crypto
      .createHmac('sha256', headerSecret)
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
  });

  describe('Signature Security Verification', () => {
    it('rejects requests missing the x-razorpay-signature header', async () => {
      const req = new Request('http://localhost:3000/api/razorpay/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'subscription.activated' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Missing signature/i);
    });

    it('rejects requests with an invalid HMAC signature', async () => {
      const rawBody = JSON.stringify({ event: 'subscription.activated' });
      const req = new Request('http://localhost:3000/api/razorpay/webhook', {
        method: 'POST',
        headers: {
          'x-razorpay-signature': 'invalid_forged_signature_hash',
          'content-type': 'application/json',
        },
        body: rawBody,
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid signature/i);
    });
  });

  describe('Initial Subscription Activation Flow', () => {
    it('activates new monthly subscription on subscription.activated event', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const nextMonthSeconds = nowSeconds + 30 * 24 * 60 * 60;

      const payload = {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_monthly_799',
              current_end: nextMonthSeconds,
              notes: { user_id: 'user_abc_456' },
            },
          },
        },
      };

      // Mock no existing subscription found
      mockSubscriptionsData = null;

      const req = createSignedRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');

      // Verify Supabase insert was invoked for new subscription
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_abc_456',
          plan: 'monthly',
          is_active: true,
          autopay_enabled: true,
          razorpay_subscription_id: 'sub_test_123',
        })
      );
    });
  });

  describe('Next-Month Autopay Recurring Renewal Flow', () => {
    it('renews next month subscription on invoice.payment_succeeded without changing plan', async () => {
      const futureEndSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const payload = {
        event: 'invoice.payment_succeeded',
        payload: {
          invoice: {
            entity: {
              id: 'inv_autopay_999',
              subscription_id: 'sub_test_123',
              period_end: futureEndSeconds,
              notes: { user_id: 'user_abc_456' },
            },
          },
          subscription: {
            entity: {
              id: 'sub_test_123',
              current_end: futureEndSeconds,
            },
          },
        },
      };

      // Mock existing active monthly subscription
      mockSubscriptionsData = {
        user_id: 'user_abc_456',
        plan: 'monthly',
        is_active: true,
        razorpay_subscription_id: 'sub_test_123',
        valid_until: new Date().toISOString(),
      };

      const req = createSignedRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');

      // Verify Supabase update was invoked with existing monthly plan preserved
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
          plan: 'monthly',
          autopay_enabled: true,
        })
      );
    });
  });
});
