// agent-notes: { ctx: "Admin attribution analytics API for source ROI, campaigns, and assisted conversions", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-14" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', me.user.id).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sourceFilter = searchParams.get('source');
    const planFilter = searchParams.get('plan');
    const campaignFilter = searchParams.get('campaign');

    // Fetch subscription attribution snapshots
    let query = admin
      .from('subscription_attributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
    if (planFilter && planFilter !== 'all') {
      query = query.eq('subscription_plan', planFilter);
    }

    const { data: rawAttributions, error: queryErr } = await query;
    if (queryErr) {
      return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });
    }

    let records = rawAttributions || [];

    // Filter by source if specified (matches either first or last source)
    if (sourceFilter && sourceFilter !== 'all') {
      records = records.filter(
        (r) => r.first_source === sourceFilter || r.last_source === sourceFilter
      );
    }

    // Filter by campaign if specified
    if (campaignFilter && campaignFilter !== 'all') {
      records = records.filter(
        (r) => r.first_campaign === campaignFilter || r.last_campaign === campaignFilter
      );
    }

    // 1. Overall Summary
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;

    records.forEach((r) => {
      const amt = Number(r.amount || 0);
      totalRevenue += amt;
      const plan = (r.subscription_plan || '').toLowerCase();
      if (plan === 'yearly') {
        yearlyRevenue += amt;
        yearlyCount += 1;
      } else {
        monthlyRevenue += amt;
        monthlyCount += 1;
      }
    });

    const totalSubscriptions = records.length;
    const avgOrderValue = totalSubscriptions > 0 ? Math.round(totalRevenue / totalSubscriptions) : 0;

    // 2. First-Touch Source Breakdown
    const firstSourceMap: Record<string, {
      source: string;
      customers: number;
      revenue: number;
      monthly: number;
      yearly: number;
    }> = {};

    // 3. Last-Touch Source Breakdown
    const lastSourceMap: Record<string, {
      source: string;
      customers: number;
      revenue: number;
      monthly: number;
      yearly: number;
    }> = {};

    // 4. Campaign Analytics
    const campaignMap: Record<string, {
      campaign: string;
      source: string;
      customers: number;
      revenue: number;
      monthly: number;
      yearly: number;
    }> = {};

    // 5. Product Attribution
    const productMap: Record<string, {
      product: string;
      subscriptions: number;
      revenue: number;
    }> = {};

    // 6. Assisted Conversions (first_source != last_source)
    const assistedMap: Record<string, {
      firstSource: string;
      lastSource: string;
      path: string;
      count: number;
      revenue: number;
    }> = {};

    records.forEach((r) => {
      const fSource = r.first_source || 'Direct';
      const lSource = r.last_source || fSource || 'Direct';
      const amt = Number(r.amount || 0);
      const isYearly = (r.subscription_plan || '').toLowerCase() === 'yearly';

      // First Touch Aggregation
      if (!firstSourceMap[fSource]) {
        firstSourceMap[fSource] = { source: fSource, customers: 0, revenue: 0, monthly: 0, yearly: 0 };
      }
      firstSourceMap[fSource].customers += 1;
      firstSourceMap[fSource].revenue += amt;
      if (isYearly) firstSourceMap[fSource].yearly += 1;
      else firstSourceMap[fSource].monthly += 1;

      // Last Touch Aggregation
      if (!lastSourceMap[lSource]) {
        lastSourceMap[lSource] = { source: lSource, customers: 0, revenue: 0, monthly: 0, yearly: 0 };
      }
      lastSourceMap[lSource].customers += 1;
      lastSourceMap[lSource].revenue += amt;
      if (isYearly) lastSourceMap[lSource].yearly += 1;
      else lastSourceMap[lSource].monthly += 1;

      // Campaign Aggregation
      const campaign = r.first_campaign || r.last_campaign;
      if (campaign) {
        if (!campaignMap[campaign]) {
          campaignMap[campaign] = {
            campaign,
            source: r.first_source || r.last_source || 'Other',
            customers: 0,
            revenue: 0,
            monthly: 0,
            yearly: 0,
          };
        }
        campaignMap[campaign].customers += 1;
        campaignMap[campaign].revenue += amt;
        if (isYearly) campaignMap[campaign].yearly += 1;
        else campaignMap[campaign].monthly += 1;
      }

      // Product Aggregation
      const product = r.first_product_viewed || r.last_product_viewed;
      if (product) {
        if (!productMap[product]) {
          productMap[product] = { product, subscriptions: 0, revenue: 0 };
        }
        productMap[product].subscriptions += 1;
        productMap[product].revenue += amt;
      }

      // Assisted Conversions (Different discovery source vs converting source)
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

    const productBreakdown = Object.values(productMap).sort(
      (a, b) => b.subscriptions - a.subscriptions
    );

    const assistedConversions = Object.values(assistedMap).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      ok: true,
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
      campaignBreakdown,
      productBreakdown,
      assistedConversions,
      recentRecords: records.slice(0, 50),
    });
  } catch (e: any) {
    console.error('Attribution analytics error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
