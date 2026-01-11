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

    // Subscriptions with detailed filtering
    let subsQuery = admin.from('subscriptions')
      .select('user_id,is_active,plan,valid_until,created_at,updated_at,razorpay_subscription_id,autopay_enabled')
      .order('created_at', { ascending: false });

    // Apply filters
    if (planFilter && ['monthly', 'yearly'].includes(planFilter)) {
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
    if (planFilter && ['monthly', 'yearly'].includes(planFilter)) {
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
      .select('id,user_id,is_active,plan,valid_until,autopay_enabled')
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
    // Weekly subscriptions are treated as monthly (legacy support)
    const activeWeekly = 0; // No new weekly subscriptions
    const activeMonthly = activeList.filter((s: any) => s.plan === 'monthly' || s.plan === 'weekly').length;
    const activeYearly = activeList.filter((s: any) => s.plan === 'yearly').length;
    const expiredSubscribers = expiredList.length;
    const cancelledSubscribers = cancelledList.length;
    const autopayEnabled = activeList.filter((s: any) => s.autopay_enabled === true).length;
    const autopayDisabled = activeList.filter((s: any) => s.autopay_enabled === false).length;

    // Map subscriptions by id for download enrichment
    const subsById: Record<string, any> = {};
    (allSubs || []).forEach((s: any) => {
      if (s.id) subsById[s.id] = s;
    });

    // Get actual subscription prices from settings
    let monthlyPrice = 799; // Default
    let yearlyPrice = 5499; // Default

    try {
      const { data: settings } = await admin.from('settings').select('key,value');
      if (settings) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((row: any) => { settingsMap[row.key] = row.value; });

        const monthlyPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || 79900);
        const yearlyPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || 549900);

        // Convert from paise to INR (if >= threshold, it's in paise)
        monthlyPrice = monthlyPaise >= 10000 ? monthlyPaise / 100 : monthlyPaise;
        yearlyPrice = yearlyPaise >= 100000 ? yearlyPaise / 100 : yearlyPaise;
      }
    } catch (e) {
      console.log('Could not fetch prices from settings, using defaults');
    }

    // Calculate MRR (Monthly Recurring Revenue)
    // Monthly: direct monthly price (includes legacy weekly subscriptions)
    const monthlyMRR = activeMonthly * monthlyPrice;
    // Yearly: convert to monthly (yearly price / 12)
    const yearlyMRR = activeYearly * (yearlyPrice / 12);
    const subscriptionMRR = monthlyMRR + yearlyMRR;

    // Also calculate total revenue if all subscriptions were paid for their full period
    const monthlyTotalRevenue = activeMonthly * monthlyPrice;
    const yearlyTotalRevenue = activeYearly * yearlyPrice;
    const totalSubscriptionRevenue = monthlyTotalRevenue + yearlyTotalRevenue;

    // Calculate revenue distribution: 40% to vendors, 60% to Celite
    const vendorPoolAmount = totalSubscriptionRevenue * 0.4;
    const celiteAmount = totalSubscriptionRevenue * 0.6;

    // Calculate total order revenue (if orders exist)
    const totalOrderRevenue = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const totalOrders = (ordersRes.data ?? []).length;

    // Get recent downloads for analytics (Combine both paid and free)
    let downloads: any[] = [];
    let totalDownloads = 0;
    let uniqueDownloadUsers = 0;
    let uniqueDownloadedTemplates = 0;
    try {
      // 1. Fetch paid downloads
      let paidDownloads: any[] = [];
      try {
        const pdRes = await admin
          .from('downloads')
          .select('id,user_id,template_slug,subscription_id,downloaded_at')
          .order('downloaded_at', { ascending: false })
          .limit(500);
        if (!pdRes.error && pdRes.data) paidDownloads = pdRes.data;
      } catch (e) {
        console.log('Paid downloads table not available');
      }

      // 2. Fetch free downloads
      let freeDownloads: any[] = [];
      try {
        const fdRes = await admin
          .from('free_downloads')
          .select('id,user_id,template_slug,downloaded_at')
          .order('downloaded_at', { ascending: false })
          .limit(500);
        if (!fdRes.error && fdRes.data) {
          // Add a flag or null subscription_id for free downloads
          freeDownloads = fdRes.data.map((d: any) => ({ ...d, subscription_id: null, is_free: true }));
        }
      } catch (e) {
        console.log('Free downloads table not available');
      }

      // Merge and sort
      downloads = [...paidDownloads, ...freeDownloads]
        .sort((a, b) => new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime())
        .slice(0, 500);

      totalDownloads = downloads.length;
      uniqueDownloadUsers = new Set(downloads.map((d: any) => d.user_id)).size;
      uniqueDownloadedTemplates = new Set(downloads.map((d: any) => d.template_slug)).size;
    } catch (e) {
      console.log('Error merging downloads analytics:', e);
    }

    // Get user emails for subscriptions and downloads (optional, for better display)
    const userIds = new Set<string>();
    (subsRes.data ?? []).forEach((s: any) => userIds.add(s.user_id));
    downloads.forEach((d: any) => userIds.add(d.user_id));
    const userEmails: Record<string, string> = {};
    if (userIds.size > 0) {
      try {
        const { data: users } = await admin.auth.admin.listUsers();
        if (users) {
          users.users.forEach((u: any) => {
            if (userIds.has(u.id) && u.email) {
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

    // Get template names for downloads
    const downloadSlugs = Array.from(new Set(downloads.map((d: any) => d.template_slug)));
    const templateNames: Record<string, string | null> = {};
    if (downloadSlugs.length > 0) {
      try {
        const { data: tpls } = await admin
          .from('templates')
          .select('slug,name')
          .in('slug', downloadSlugs);
        (tpls ?? []).forEach((t: any) => {
          templateNames[t.slug] = t.name ?? null;
        });
      } catch (e) {
        console.log('Could not fetch template names for downloads');
      }
    }

    // Enrich downloads with user email, template name, and subscription plan
    const enrichedDownloads = downloads.map((d: any) => {
      const sub = d.subscription_id ? subsById[d.subscription_id] : null;
      return {
        id: d.id,
        user_id: d.user_id,
        user_email: userEmails[d.user_id] || null,
        template_slug: d.template_slug,
        template_name: templateNames[d.template_slug] || null,
        subscription_id: d.subscription_id,
        subscription_plan: d.is_free ? 'FREE' : (sub?.plan ?? null),
        downloaded_at: d.downloaded_at,
        is_free: d.is_free || false
      };
    });

    return NextResponse.json({
      ok: true,
      totals: {
        orderRevenue: totalOrderRevenue,
        subscriptionRevenue: Number(subscriptionMRR.toFixed(2)),
        totalSubscriptionRevenue: Number(totalSubscriptionRevenue.toFixed(2)),
        vendorPoolAmount: Number(vendorPoolAmount.toFixed(2)),
        celiteAmount: Number(celiteAmount.toFixed(2)),
        monthlyPrice,
        yearlyPrice,
        orders: totalOrders,
        activeSubscribers,
        activeWeekly: 0, // No new weekly subscriptions
        activeMonthly,
        activeYearly,
        expiredSubscribers,
        cancelledSubscribers,
        autopayEnabled,
        autopayDisabled,
        totalSubscriptions: allSubs.length,
        totalDownloads,
        uniqueDownloadUsers,
        uniqueDownloadedTemplates,
      },
      orders: ordersRes.data ?? [],
      order_items: items,
      subscriptions: enrichedSubs,
      downloads: enrichedDownloads,
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


