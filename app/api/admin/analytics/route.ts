import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const meId = me.user.id;
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', meId).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const planFilter = searchParams.get('plan'); // 'weekly', 'monthly', 'yearly', or null for all
    const statusFilter = searchParams.get('status'); // 'active', 'expired', 'cancelled', or null for all
    const autopayFilter = searchParams.get('autopay'); // 'true', 'false', or null for all
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Try to get orders (may not exist if table was removed)
    let ordersRes: any = { data: [], error: null };
    let items: any[] = [];
    try {
      ordersRes = await admin.from('orders')
      .select('id,user_id,created_at,total,status')
      .order('created_at', { ascending: false })
      .limit(200);
      if (!ordersRes.error && ordersRes.data) {
    const orderIds = (ordersRes.data ?? []).map((o: any) => o.id);
    if (orderIds.length) {
      const itemsRes = await admin.from('order_items')
        .select('order_id,name,quantity,price')
        .in('order_id', orderIds);
          if (!itemsRes.error) items = itemsRes.data ?? [];
        }
      }
    } catch (e: any) {
      // Orders table doesn't exist - that's okay, continue without it
      console.log('Orders table not found, skipping order data');
    }

    // Download analytics
    let downloadStats: { total: number; last7Days: number; last24Hours: number } = {
      total: 0,
      last7Days: 0,
      last24Hours: 0,
    };
    let recentDownloads: any[] = [];
    let topDownloadedTemplates: any[] = [];
    try {
      const totalDownloadsRes = await admin
        .from('downloads')
        .select('id', { count: 'exact', head: true });
      downloadStats.total = totalDownloadsRes.count || 0;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const downloads7dRes = await admin
        .from('downloads')
        .select('id', { count: 'exact', head: true })
        .gte('downloaded_at', sevenDaysAgo);
      downloadStats.last7Days = downloads7dRes.count || 0;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const downloads24hRes = await admin
        .from('downloads')
        .select('id', { count: 'exact', head: true })
        .gte('downloaded_at', oneDayAgo);
      downloadStats.last24Hours = downloads24hRes.count || 0;

      const recentDownloadsRes = await admin
        .from('downloads')
        .select('id,user_id,template_id,subscription_id,downloaded_at')
        .order('downloaded_at', { ascending: false })
        .limit(20);
      if (!recentDownloadsRes.error && recentDownloadsRes.data) {
        recentDownloads = recentDownloadsRes.data;
      }

      const topTemplateRows = await admin
        .from('downloads')
        .select('template_id')
        .not('template_id', 'is', null)
        .limit(1000);
      if (!topTemplateRows.error && topTemplateRows.data) {
        const frequencyMap: Record<string, number> = {};
        topTemplateRows.data.forEach((row: any) => {
          const tplId = row.template_id;
          if (!tplId) return;
          frequencyMap[tplId] = (frequencyMap[tplId] || 0) + 1;
        });
        topDownloadedTemplates = Object.entries(frequencyMap)
          .map(([template_id, count]) => ({ template_id, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }
    } catch (downloadErr) {
      console.error('Download analytics error:', downloadErr);
    }

    const templateIds = Array.from(
      new Set([
        ...recentDownloads.map((d: any) => d.template_id).filter(Boolean),
        ...topDownloadedTemplates.map((t: any) => t.template_id).filter(Boolean),
      ])
    );
    const templateMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      try {
        const { data: templateRows } = await admin
          .from('templates')
          .select('id,name,slug,img')
          .in('id', templateIds);
        (templateRows ?? []).forEach((tpl: any) => {
          templateMap[tpl.id] = tpl;
        });
      } catch (tplErr) {
        console.error('Template lookup failed for downloads:', tplErr);
      }
    }

    // Subscriptions with detailed filtering
    let subsQuery = admin.from('subscriptions')
      .select('user_id,is_active,plan,valid_until,created_at,updated_at,razorpay_subscription_id,autopay_enabled')
      .order('created_at', { ascending: false });

    // Apply filters
    if (planFilter && ['weekly', 'monthly', 'yearly'].includes(planFilter)) {
      subsQuery = subsQuery.eq('plan', planFilter);
    }
    if (statusFilter === 'active') {
      subsQuery = subsQuery.eq('is_active', true);
    } else if (statusFilter === 'cancelled') {
      subsQuery = subsQuery.eq('is_active', false);
    }
    if (autopayFilter === 'true') {
      subsQuery = subsQuery.eq('autopay_enabled', true);
    } else if (autopayFilter === 'false') {
      subsQuery = subsQuery.eq('autopay_enabled', false);
    }

    subsQuery = subsQuery.range(offset, offset + limit - 1);

    const subsRes = await subsQuery;
    if (subsRes.error) return NextResponse.json({ ok: false, error: subsRes.error.message }, { status: 500 });

    // Get total count for pagination (without limit)
    let countQuery = admin.from('subscriptions').select('*', { count: 'exact', head: true });
    if (planFilter && ['weekly', 'monthly', 'yearly'].includes(planFilter)) {
      countQuery = countQuery.eq('plan', planFilter);
    }
    if (statusFilter === 'active') {
      countQuery = countQuery.eq('is_active', true);
    } else if (statusFilter === 'cancelled') {
      countQuery = countQuery.eq('is_active', false);
    }
    if (autopayFilter === 'true') {
      countQuery = countQuery.eq('autopay_enabled', true);
    } else if (autopayFilter === 'false') {
      countQuery = countQuery.eq('autopay_enabled', false);
    }
    const countRes = await countQuery;
    const totalCount = countRes.count || 0;

    // Get all subscriptions for aggregate calculations (without filters)
    const allSubsRes = await admin.from('subscriptions')
      .select('user_id,is_active,plan,valid_until,autopay_enabled')
      .order('created_at', { ascending: false });
    const allSubs = allSubsRes.data ?? [];

    // Calculate aggregates
    const now = Date.now();
    const activeList = allSubs.filter((s: any) => {
      const isActive = s.is_active === true;
      const isValid = !s.valid_until || new Date(s.valid_until).getTime() > now;
      return isActive && isValid;
    });
    const expiredList = allSubs.filter((s: any) => {
      const isActive = s.is_active === true;
      const isValid = !s.valid_until || new Date(s.valid_until).getTime() > now;
      return isActive && !isValid; // Active but expired
    });
    const cancelledList = allSubs.filter((s: any) => s.is_active === false);

    const activeSubscribers = activeList.length;
    const activeWeekly = activeList.filter((s: any) => s.plan === 'weekly').length;
    const activeMonthly = activeList.filter((s: any) => s.plan === 'monthly').length;
    const activeYearly = activeList.filter((s: any) => s.plan === 'yearly').length;
    const expiredSubscribers = expiredList.length;
    const cancelledSubscribers = cancelledList.length;
    const autopayEnabled = activeList.filter((s: any) => s.autopay_enabled === true).length;
    const autopayDisabled = activeList.filter((s: any) => s.autopay_enabled === false).length;

    // Get actual subscription prices from settings
    let weeklyPrice = 199; // Default
    let monthlyPrice = 799; // Default
    let yearlyPrice = 5499; // Default
    
    try {
      const { data: settings } = await admin.from('settings').select('key,value');
      if (settings) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((row: any) => { settingsMap[row.key] = row.value; });
        
        const weeklyPaise = Number(settingsMap.RAZORPAY_WEEKLY_AMOUNT || 19900);
        const monthlyPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || 79900);
        const yearlyPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || 549900);
        
        // Convert from paise to INR (if >= threshold, it's in paise)
        weeklyPrice = weeklyPaise >= 1000 ? weeklyPaise / 100 : weeklyPaise;
        monthlyPrice = monthlyPaise >= 10000 ? monthlyPaise / 100 : monthlyPaise;
        yearlyPrice = yearlyPaise >= 100000 ? yearlyPaise / 100 : yearlyPaise;
      }
    } catch (e) {
      console.log('Could not fetch prices from settings, using defaults');
    }
    
    // Calculate MRR (Monthly Recurring Revenue)
    // Weekly: convert to monthly equivalent (weekly price * 4.33 weeks per month)
    const weeklyMRR = activeWeekly * weeklyPrice * 4.33;
    // Monthly: direct monthly price
    const monthlyMRR = activeMonthly * monthlyPrice;
    // Yearly: convert to monthly (yearly price / 12)
    const yearlyMRR = activeYearly * (yearlyPrice / 12);
    const subscriptionMRR = weeklyMRR + monthlyMRR + yearlyMRR;
    
    // Also calculate total revenue if all subscriptions were paid for their full period
    const weeklyTotalRevenue = activeWeekly * weeklyPrice;
    const monthlyTotalRevenue = activeMonthly * monthlyPrice;
    const yearlyTotalRevenue = activeYearly * yearlyPrice;
    const totalSubscriptionRevenue = weeklyTotalRevenue + monthlyTotalRevenue + yearlyTotalRevenue;

    // Calculate total order revenue (if orders exist)
    const totalOrderRevenue = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const totalOrders = (ordersRes.data ?? []).length;

    // Get user emails for subscriptions (optional, for better display)
    const subscriptionUserIds = (subsRes.data ?? []).map((s: any) => s.user_id);
    const downloadUserIds = recentDownloads.map((d: any) => d.user_id);
    const userIds = [...new Set([...subscriptionUserIds, ...downloadUserIds])];
    const userEmails: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const { data: users } = await admin.auth.admin.listUsers();
        if (users) {
          users.users.forEach((u: any) => {
            if (userIds.includes(u.id) && u.email) {
              userEmails[u.id] = u.email;
            }
          });
        }
      } catch (e) {
        // If we can't get user emails, continue without them
        console.log('Could not fetch user emails');
      }
    }

    // Enrich subscription data with user emails
    const enrichedSubs = (subsRes.data ?? []).map((s: any) => ({
      ...s,
      user_email: userEmails[s.user_id] || null,
      is_actually_active: s.is_active && (!s.valid_until || new Date(s.valid_until).getTime() > now),
      days_remaining: s.valid_until ? Math.ceil((new Date(s.valid_until).getTime() - now) / (1000 * 60 * 60 * 24)) : null,
    }));

    const enrichedRecentDownloads = recentDownloads.map((dl: any) => ({
      ...dl,
      user_email: userEmails[dl.user_id] || null,
      template_name: templateMap[dl.template_id]?.name || null,
      template_slug: templateMap[dl.template_id]?.slug || null,
    }));

    const enrichedTopDownloads = topDownloadedTemplates.map((row: any) => ({
      template_id: row.template_id,
      count: Number((row as any).count) || 0,
      template_name: templateMap[row.template_id]?.name || null,
      template_slug: templateMap[row.template_id]?.slug || null,
    }));

    return NextResponse.json({
      ok: true,
      totals: {
        orderRevenue: totalOrderRevenue,
        subscriptionRevenue: Number(subscriptionMRR.toFixed(2)),
        totalSubscriptionRevenue: Number(totalSubscriptionRevenue.toFixed(2)),
        subscriptionDownloads: downloadStats.total,
        weeklyPrice,
        monthlyPrice,
        yearlyPrice,
        orders: totalOrders,
        activeSubscribers,
        activeWeekly,
        activeMonthly,
        activeYearly,
        expiredSubscribers,
        cancelledSubscribers,
        autopayEnabled,
        autopayDisabled,
        totalSubscriptions: allSubs.length,
      },
      orders: ordersRes.data ?? [],
      order_items: items,
      subscriptions: enrichedSubs,
      downloadStats,
      recentDownloads: enrichedRecentDownloads,
      topDownloads: enrichedTopDownloads,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (e: any) {
    console.error('Analytics error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


