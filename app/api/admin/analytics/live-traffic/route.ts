// agent-notes: { ctx: "Admin API endpoint for real-time live traffic activity stream, all-visitor views, signups by source, trend charts, and full funnel analytics", deps: ["lib/supabaseAdmin.ts", "lib/attribution.ts"], state: active, last: "sato@2026-08-20" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { resolveContentNames, type RegistryMapping } from '../../../../../lib/attribution';

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
    const eventType = searchParams.get('eventType');
    const sourceFilter = searchParams.get('source');
    const deviceFilter = searchParams.get('device');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 1. Auto-prune touchpoints older than 5 hours (5-hour TTL retention)
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    await admin.from('visitor_touchpoints').delete().lt('created_at', fiveHoursAgo);

    // 2. Fetch Marketing Registry for name resolution
    const { data: rawRegistry } = await admin.from('marketing_sources_registry').select('*');
    const registry: RegistryMapping[] = rawRegistry || [];

    // 3. Query visitor_touchpoints (only last 5 hours retained)
    let query = admin
      .from('visitor_touchpoints')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    } else {
      query = query.gte('created_at', fiveHoursAgo);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
    if (eventType && eventType !== 'all') {
      query = query.eq('event_type', eventType);
    }
    if (sourceFilter && sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter);
    }
    if (deviceFilter && deviceFilter !== 'all') {
      query = query.eq('device_type', deviceFilter);
    }

    const { data: rawTouchpoints, error: queryErr } = await query;
    if (queryErr) {
      return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });
    }

    const allEvents = rawTouchpoints || [];

    // Filter by search string if present (path, product_slug, campaign, user_id, source)
    let filteredEvents = allEvents;
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filteredEvents = allEvents.filter(
        (e) =>
          e.path?.toLowerCase().includes(q) ||
          e.product_slug?.toLowerCase().includes(q) ||
          e.source?.toLowerCase().includes(q) ||
          e.campaign?.toLowerCase().includes(q) ||
          e.referrer_url?.toLowerCase().includes(q) ||
          e.anonymous_id?.toLowerCase().includes(q) ||
          e.user_id?.toLowerCase().includes(q)
      );
    }

    // 3. User info resolution
    const userIds = Array.from(new Set(filteredEvents.map((e) => e.user_id).filter(Boolean)));
    const userEmailMap = new Map<string, string>();
    if (userIds.length > 0) {
      try {
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);
        (profiles || []).forEach((p) => {
          if (p.id) userEmailMap.set(p.id, p.email || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.id);
        });
      } catch {
        // Fallback gracefully
      }
    }

    // 4. Aggregate Metrics
    const totalViews = allEvents.length;
    const uniqueAnonymous = new Set(allEvents.map((e) => e.anonymous_id).filter(Boolean)).size;
    const uniqueSessions = new Set(allEvents.map((e) => e.session_id).filter(Boolean)).size;
    const uniqueUsers = new Set(allEvents.map((e) => e.user_id).filter(Boolean)).size;

    let productViewsCount = 0;
    let signupsCount = 0;
    let checkoutStartsCount = 0;
    let subscriptionsCount = 0;

    const sourceMap: Record<
      string,
      {
        source: string;
        views: number;
        uniqueVisitors: Set<string>;
        productViews: number;
        signups: number;
        checkouts: number;
        subscriptions: number;
      }
    > = {};

    const pageMap: Record<string, { path: string; views: number }> = {};
    const productMap: Record<string, { product: string; views: number; topSource: string }> = {};
    const deviceMap: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browserMap: Record<string, number> = {};
    const eventTypeCountMap: Record<string, number> = {};
    const timelineBucketMap: Record<string, { time: string; views: number; productViews: number; signups: number; checkouts: number; subscriptions: number }> = {};

    const signupsList: Array<{
      id: string;
      userId: string;
      email?: string;
      source: string;
      campaign?: string | null;
      path: string;
      timestamp: string;
    }> = [];

    allEvents.forEach((t) => {
      const isProduct = t.event_type === 'product_view' || Boolean(t.product_slug);
      const isSignup = t.event_type === 'signup' || t.path?.includes('/signup') || t.path?.includes('/register');
      const isCheckout = t.event_type === 'checkout_started' || t.path?.includes('/checkout');
      const isSub = t.event_type === 'subscription_created';

      if (isProduct) productViewsCount += 1;
      if (isSignup) {
        signupsCount += 1;
        if (t.user_id) {
          signupsList.push({
            id: t.id,
            userId: t.user_id,
            email: userEmailMap.get(t.user_id) || t.user_id,
            source: t.source || 'Direct',
            campaign: t.campaign || null,
            path: t.path || '/',
            timestamp: t.created_at,
          });
        }
      }
      if (isCheckout) checkoutStartsCount += 1;
      if (isSub) subscriptionsCount += 1;

      // Event Type Distribution
      const evType = t.event_type || 'landing';
      eventTypeCountMap[evType] = (eventTypeCountMap[evType] || 0) + 1;

      // Source breakdown
      const src = t.source || 'Direct';
      if (!sourceMap[src]) {
        sourceMap[src] = {
          source: src,
          views: 0,
          uniqueVisitors: new Set(),
          productViews: 0,
          signups: 0,
          checkouts: 0,
          subscriptions: 0,
        };
      }
      sourceMap[src].views += 1;
      if (t.anonymous_id) sourceMap[src].uniqueVisitors.add(t.anonymous_id);
      if (isProduct) sourceMap[src].productViews += 1;
      if (isSignup) sourceMap[src].signups += 1;
      if (isCheckout) sourceMap[src].checkouts += 1;
      if (isSub) sourceMap[src].subscriptions += 1;

      // Pages
      const p = t.path || '/';
      if (!pageMap[p]) pageMap[p] = { path: p, views: 0 };
      pageMap[p].views += 1;

      // Products
      if (t.product_slug) {
        if (!productMap[t.product_slug]) {
          productMap[t.product_slug] = { product: t.product_slug, views: 0, topSource: src };
        }
        productMap[t.product_slug].views += 1;
      }

      // Devices & Browsers
      const dev = t.device_type || 'Desktop';
      deviceMap[dev] = (deviceMap[dev] || 0) + 1;
      const br = t.browser || 'Unknown';
      browserMap[br] = (browserMap[br] || 0) + 1;

      // Time series bucket (by hour or day)
      try {
        const d = new Date(t.created_at);
        const timeKey = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
        if (!timelineBucketMap[timeKey]) {
          timelineBucketMap[timeKey] = { time: timeKey, views: 0, productViews: 0, signups: 0, checkouts: 0, subscriptions: 0 };
        }
        timelineBucketMap[timeKey].views += 1;
        if (isProduct) timelineBucketMap[timeKey].productViews += 1;
        if (isSignup) timelineBucketMap[timeKey].signups += 1;
        if (isCheckout) timelineBucketMap[timeKey].checkouts += 1;
        if (isSub) timelineBucketMap[timeKey].subscriptions += 1;
      } catch {
        // Continue
      }
    });

    const sourcesBreakdown = Object.values(sourceMap)
      .map((s) => ({
        source: s.source,
        views: s.views,
        uniqueVisitors: s.uniqueVisitors.size,
        productViews: s.productViews,
        signups: s.signups,
        checkouts: s.checkouts,
        subscriptions: s.subscriptions,
        signupRate: s.views > 0 ? Math.round((s.signups / s.views) * 1000) / 10 : 0,
        conversionRate: s.views > 0 ? Math.round((s.subscriptions / s.views) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.views - a.views);

    // Funnel Stages Aggregation
    const funnelStages = [
      { stage: '1. Total Pageviews', count: totalViews, rate: 100 },
      { stage: '2. Product Views', count: productViewsCount, rate: totalViews > 0 ? Math.round((productViewsCount / totalViews) * 100) : 0 },
      { stage: '3. User Signups', count: signupsCount, rate: totalViews > 0 ? Math.round((signupsCount / totalViews) * 100) : 0 },
      { stage: '4. Checkout Starts', count: checkoutStartsCount, rate: totalViews > 0 ? Math.round((checkoutStartsCount / totalViews) * 100) : 0 },
      { stage: '5. Subscriptions', count: subscriptionsCount, rate: totalViews > 0 ? Math.round((subscriptionsCount / totalViews) * 100) : 0 },
    ];

    // Timeline trend array sorted chronologically
    const timelineTrend = Object.values(timelineBucketMap).slice(-24);

    // Event Type distribution for donut charts
    const eventTypeDistribution = Object.entries(eventTypeCountMap).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));

    // Signups by source pie dataset
    const signupsBySource = sourcesBreakdown
      .filter((s) => s.signups > 0)
      .map((s) => ({
        name: s.source,
        value: s.signups,
      }));

    // Paginated Stream Slice
    const startIndex = (page - 1) * limit;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limit).map((e) => {
      const resolved = resolveContentNames(
        {
          campaign: e.campaign,
          campaign_id: e.campaign_id,
          content: e.content,
          content_id: e.content_id,
          source: e.source,
        },
        registry
      );

      return {
        ...e,
        user_email: e.user_id ? userEmailMap.get(e.user_id) || e.user_id : null,
        resolved_campaign_name: resolved.campaign_name,
        resolved_content_name: resolved.content_name,
        resolved_adset_name: resolved.adset_name,
      };
    });

    return NextResponse.json({
      ok: true,
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
      funnelStages,
      timelineTrend,
      eventTypeDistribution,
      signupsBySource,
      signupsList: signupsList.slice(0, 50),
      topPages: Object.values(pageMap).sort((a, b) => b.views - a.views).slice(0, 20),
      topProducts: Object.values(productMap).sort((a, b) => b.views - a.views).slice(0, 20),
      deviceBreakdown: deviceMap,
      browserBreakdown: browserMap,
      pagination: {
        page,
        limit,
        total: filteredEvents.length,
        totalPages: Math.ceil(filteredEvents.length / limit),
      },
      events: paginatedEvents,
    });
  } catch (e: unknown) {
    console.error('Live traffic analytics error:', e);
    const msg = e instanceof Error ? e.message : 'Error loading live traffic logs';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
