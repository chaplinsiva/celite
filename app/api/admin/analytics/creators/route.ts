// agent-notes: { ctx: "API route for creator analytics including pay-per and pool money", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-13" }

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // 1. Verify admin authentication
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }

    const { data: isAdmin } = await admin
      .from('admins')
      .select('user_id')
      .eq('user_id', me.user.id)
      .maybeSingle();

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch Creator Shops
    const { data: shops, error: shopsErr } = await admin
      .from('creator_shops')
      .select('id, name, slug, user_id, total_earnings, is_celite_official');
    if (shopsErr) {
      return NextResponse.json({ ok: false, error: shopsErr.message }, { status: 500 });
    }

    const creatorShops = shops || [];
    const shopOfficialMap = new Map<string, boolean>();
    for (const s of creatorShops) {
      shopOfficialMap.set(s.id, s.is_celite_official || false);
    }

    // 3. Fetch Payout Requests (to calculate paid & pending amounts per creator)
    const { data: payouts, error: payoutsErr } = await admin
      .from('creator_payout_requests')
      .select('creator_shop_id, amount, status');
    if (payoutsErr) {
      return NextResponse.json({ ok: false, error: payoutsErr.message }, { status: 500 });
    }

    // Map payout details per shop
    const payoutsMap = new Map<string, { paid: number; pending: number }>();
    for (const p of payouts || []) {
      const shopId = p.creator_shop_id;
      if (!shopId) continue;
      const amt = Number(p.amount) || 0;
      const status = (p.status || '').toLowerCase();

      if (!payoutsMap.has(shopId)) {
        payoutsMap.set(shopId, { paid: 0, pending: 0 });
      }
      const val = payoutsMap.get(shopId)!;
      if (status === 'paid') {
        val.paid += amt;
      } else if (status === 'pending') {
        val.pending += amt;
      }
    }

    // 4. Fetch Official Creator Earnings (from creator_earnings table)
    const { data: earnings, error: earningsErr } = await admin
      .from('creator_earnings')
      .select('creator_shop_id, creator_earning, earning_type');
    if (earningsErr) {
      return NextResponse.json({ ok: false, error: earningsErr.message }, { status: 500 });
    }

    // Map official earnings per shop
    const officialEarningsMap = new Map<string, { marketplace: number; subscription: number }>();
    for (const e of earnings || []) {
      const shopId = e.creator_shop_id;
      if (!shopId) continue;
      const amt = Number(e.creator_earning) || 0;
      const isSub = e.earning_type === 'subscription';

      if (!officialEarningsMap.has(shopId)) {
        officialEarningsMap.set(shopId, { marketplace: 0, subscription: 0 });
      }
      const val = officialEarningsMap.get(shopId)!;
      if (isSub) {
        val.subscription += amt;
      } else {
        val.marketplace += amt;
      }
    }

    // 5. Calculate Fallback Pay-Per (Marketplace) Sales from order_items
    const { data: paidOrders } = await admin
      .from('orders')
      .select('id')
      .eq('status', 'paid');
    const paidOrderIds = (paidOrders || []).map((o) => o.id);

    let orderItems: any[] = [];
    if (paidOrderIds.length > 0) {
      const { data: items } = await admin
        .from('order_items')
        .select('slug, price, creator_shop_id')
        .in('order_id', paidOrderIds);
      orderItems = items || [];
    }

    // Fetch all templates to resolve creator_shop_id and original status
    const { data: templates } = await admin
      .from('templates')
      .select('slug, creator_shop_id');
    const templatesMap = new Map<string, { creator_shop_id: string | null; is_original: boolean }>();
    for (const t of templates || []) {
      const shopId = t.creator_shop_id || null;
      const isOfficial = shopId ? (shopOfficialMap.get(shopId) || false) : true;
      templatesMap.set(t.slug, {
        creator_shop_id: shopId,
        is_original: isOfficial,
      });
    }

    // Group fallback pay-per earnings by creator shop
    const dynamicPayPerMap = new Map<string, number>();
    for (const item of orderItems) {
      let shopId = item.creator_shop_id;
      // Resolve shop ID from templates if null in order item
      if (!shopId && item.slug) {
        shopId = templatesMap.get(item.slug)?.creator_shop_id || null;
      }
      if (!shopId) continue;

      const price = Number(item.price) || 0;
      const creatorShare = price * 0.80; // 80% creator commission rate

      dynamicPayPerMap.set(shopId, (dynamicPayPerMap.get(shopId) || 0) + creatorShare);
    }

    // 6. Calculate Fallback Pool Money (Subscription) distribution
    // Sum all completed subscription checkout amounts
    const { data: completedSubs } = await admin
      .from('checkout_details')
      .select('total_amount')
      .eq('status', 'completed')
      .eq('checkout_type', 'subscription');

    const totalSubRevenue = (completedSubs || []).reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
    const totalVendorPool = totalSubRevenue * 0.40; // 40% vendor pool split

    // Fetch downloads to determine distribution shares based on subscription downloads
    const { data: downloads } = await admin
      .from('downloads')
      .select('template_slug, creator_shop_id, subscription_id');

    const dynamicPoolDownloadsMap = new Map<string, number>();
    let totalSubDownloads = 0;

    for (const d of downloads || []) {
      // Must be a subscription download (subscription_id is not null)
      if (!d.subscription_id) continue;

      let shopId = d.creator_shop_id;
      let isOriginal = true;

      if (d.template_slug) {
        const tInfo = templatesMap.get(d.template_slug);
        if (tInfo) {
          if (!shopId) shopId = tInfo.creator_shop_id;
          isOriginal = tInfo.is_original;
        }
      }

      // Pool split only applies to third-party creator templates (is_original = false)
      if (shopId && !isOriginal) {
        dynamicPoolDownloadsMap.set(shopId, (dynamicPoolDownloadsMap.get(shopId) || 0) + 1);
        totalSubDownloads++;
      }
    }

    // 7. Consolidate results for each creator shop
    const consolidatedCreators = creatorShops.map((shop) => {
      const p = payoutsMap.get(shop.id) || { paid: 0, pending: 0 };
      const official = officialEarningsMap.get(shop.id) || { marketplace: 0, subscription: 0 };

      // Fallbacks
      const fallbackPayPer = dynamicPayPerMap.get(shop.id) || 0;
      const downloadsCount = dynamicPoolDownloadsMap.get(shop.id) || 0;
      const downloadsProportion = totalSubDownloads > 0 ? downloadsCount / totalSubDownloads : 0;
      const fallbackPool = totalVendorPool * downloadsProportion;

      const officialGross = official.marketplace + official.subscription;
      const officialWithdrawable = Math.max(0, officialGross - (p.paid + p.pending));

      const dynamicGross = fallbackPayPer + fallbackPool;
      const dynamicWithdrawable = Math.max(0, dynamicGross - (p.paid + p.pending));

      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        user_id: shop.user_id,
        // Official Ledger (from creator_earnings)
        official: {
          payPer: Number(official.marketplace.toFixed(2)),
          pool: Number(official.subscription.toFixed(2)),
          gross: Number(officialGross.toFixed(2)),
          withdrawable: Number(officialWithdrawable.toFixed(2)),
        },
        // Dynamic simulation ledger
        dynamic: {
          payPer: Number(fallbackPayPer.toFixed(2)),
          pool: Number(fallbackPool.toFixed(2)),
          gross: Number(dynamicGross.toFixed(2)),
          withdrawable: Number(dynamicWithdrawable.toFixed(2)),
          downloadsCount,
          downloadsProportion: Number((downloadsProportion * 100).toFixed(2)),
        },
        // Payouts
        payouts: {
          paid: Number(p.paid.toFixed(2)),
          pending: Number(p.pending.toFixed(2)),
          totalDeductions: Number((p.paid + p.pending).toFixed(2)),
        },
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        creators: consolidatedCreators,
        platformSummary: {
          totalSubscriptionRevenue: Number(totalSubRevenue.toFixed(2)),
          totalVendorPool: Number(totalVendorPool.toFixed(2)),
          totalSubscriptionDownloads: totalSubDownloads,
        },
      },
    });
  } catch (e: any) {
    console.error('Error in creators analytics API:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
