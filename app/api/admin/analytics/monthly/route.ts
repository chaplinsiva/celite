// agent-notes: { ctx: "database-driven monthly revenue analytics with correct plan detection and upcoming autopay prediction", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-13" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

// Only check explicit plan column first, and use current cycle duration (valid_until - reference_date) as a robust fallback
function getEffectivePlan(s: any, c?: any): 'yearly' | 'monthly' {
  if (c && (c.subscription_plan === 'yearly' || c.subscription_plan === 'annual')) return 'yearly';
  if (s && (s.plan === 'yearly' || s.plan === 'annual')) return 'yearly';
  if (s && s.valid_until) {
    const referenceDate = s.updated_at || s.created_at;
    if (referenceDate) {
      const refTs = new Date(referenceDate).getTime();
      const validUntilTs = new Date(s.valid_until).getTime();
      const daysDiff = (validUntilTs - refTs) / (1000 * 60 * 60 * 24);
      if (daysDiff > 60) return 'yearly';
    }
  }
  return 'monthly';
}

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

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const defaultMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

    // Target month param format: YYYY-MM
    const selectedMonth = searchParams.get('month') || defaultMonthStr;

    // Get pricing settings
    let monthlyPrice = 799;
    let yearlyPrice = 5499;
    try {
      const { data: settings } = await admin.from('settings').select('key,value');
      if (settings) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((row: any) => { settingsMap[row.key] = row.value; });
        const rawMonthly = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || 79900);
        const rawYearly = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || 549900);
        monthlyPrice = rawMonthly >= 100 ? rawMonthly / 100 : rawMonthly;
        yearlyPrice = rawYearly >= 100 ? rawYearly / 100 : rawYearly;
      }
    } catch (e) {
      console.log('Could not fetch settings prices, using defaults');
    }

    // Fetch all subscriptions
    const { data: allSubs, error: subsErr } = await admin
      .from('subscriptions')
      .select('id,user_id,is_active,plan,valid_until,created_at,updated_at,razorpay_subscription_id,autopay_enabled')
      .order('created_at', { ascending: false });

    if (subsErr) return NextResponse.json({ ok: false, error: subsErr.message }, { status: 500 });
    const subs = allSubs || [];

    // Fetch all checkout logs
    let checkouts: any[] = [];
    try {
      const { data: checkoutData } = await admin
        .from('checkout_details')
        .select('*')
        .order('created_at', { ascending: false });
      if (checkoutData) checkouts = checkoutData;
    } catch (e) {
      console.log('checkout_details table missing or error');
    }

    // Fetch orders if exist
    let orders: any[] = [];
    try {
      const { data: orderData } = await admin
        .from('orders')
        .select('id,user_id,created_at,total,status')
        .order('created_at', { ascending: false });
      if (orderData) orders = orderData;
    } catch (e) {
      console.log('orders table missing or error');
    }

    // Map users info (emails, phones, names)
    const userIds = new Set<string>();
    subs.forEach((s: any) => userIds.add(s.user_id));
    checkouts.forEach((c: any) => { if (c.user_id) userIds.add(c.user_id); });
    orders.forEach((o: any) => { if (o.user_id) userIds.add(o.user_id); });

    const userEmails: Record<string, string> = {};
    const userPhones: Record<string, string> = {};
    const userNames: Record<string, string> = {};

    if (userIds.size > 0) {
      try {
        const { data: usersData } = await admin
          .from('users_view')
          .select('id,email,phone,raw_user_meta_data')
          .in('id', Array.from(userIds));

        if (usersData) {
          usersData.forEach((u: any) => {
            if (u.email) userEmails[u.id] = u.email;
            if (u.phone) userPhones[u.id] = u.phone;
            const meta = u.raw_user_meta_data || {};
            const name = meta.full_name || meta.name ||
              (meta.first_name ? `${meta.first_name} ${meta.last_name || ''}`.trim() : '') ||
              (u.email ? u.email.split('@')[0] : '');
            if (name) userNames[u.id] = name;
          });
        }
      } catch (e) {
        console.log('users_view lookup failed');
      }

      checkouts.forEach((c: any) => {
        if (c.user_id) {
          if (!userPhones[c.user_id] && c.billing_mobile) userPhones[c.user_id] = c.billing_mobile;
          if (!userNames[c.user_id] && c.billing_name) userNames[c.user_id] = c.billing_name;
          if (!userEmails[c.user_id] && c.billing_email) userEmails[c.user_id] = c.billing_email;
        }
      });
    }

    // Build 12-Month Historical Time Series data
    const monthlySeries: Array<{
      monthKey: string;
      monthLabel: string;
      // Received Actual Cash (only from completed checkouts)
      totalRevenue: number;
      autopayRevenue: number;
      manualRevenue: number;
      monthlySubRevenue: number;
      yearlySubRevenue: number;
      ordersRevenue: number;
      vendorPool: number;
      celiteShare: number;
      monthlySubCount: number;
      yearlySubCount: number;
      autopaySubscribers: number;
      manualSubscribers: number;
      completedCheckouts: number;
      // Expected Potential
      expectedTotalRevenue: number;
      expectedAutopayRevenue: number;
      expectedManualRevenue: number;
      expectedMonthlyRevenue: number;
      expectedYearlyRevenue: number;
      expectedVendorPool: number;
      expectedCeliteShare: number;
      expectedMonthlySubCount: number;
      expectedYearlySubCount: number;
      expectedAutopaySubscribers: number;
      expectedManualSubscribers: number;
      activeSubscribers: number;
      pendingCollection: number;
      collectionPct: number;
      // Created & Updated Activity
      createdSubscribers: number;
      updatedSubscribers: number;
      createdMonthlyCount: number;
      createdYearlyCount: number;
      updatedMonthlyCount: number;
      updatedYearlyCount: number;
      // Upcoming Auto-Pay Prediction
      upcomingAutopayCount: number;
      upcomingAutopayRevenue: number;
      upcomingManualCount: number;
      upcomingManualRevenue: number;
      momGrowthPct: number;
      momAutopayGrowthPct: number;
    }> = [];

    // Generate past 12 months array
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Month bounds
      const startOfMonth = new Date(year, d.getMonth(), 1).getTime();
      const endOfMonth = new Date(year, d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      // 1. Subscriptions created in this month
      const createdInMonth = subs.filter((s: any) => {
        if (!s.created_at) return false;
        const ts = new Date(s.created_at).getTime();
        return ts >= startOfMonth && ts <= endOfMonth;
      });

      // 2. Subscriptions updated/renewed in this month
      const updatedInMonth = subs.filter((s: any) => {
        if (!s.updated_at) return false;
        const createdTs = s.created_at ? new Date(s.created_at).getTime() : 0;
        const updatedTs = new Date(s.updated_at).getTime();
        return updatedTs >= startOfMonth && updatedTs <= endOfMonth && createdTs < startOfMonth;
      });

      // Combined subscriptions active or processed in this month (Total 23-25 subs)
      const monthSubsCombined = [...createdInMonth, ...updatedInMonth];

      // 3. Completed checkouts in this month
      const monthCheckouts = checkouts.filter((c: any) => {
        if (!c.created_at || c.status !== 'completed') return false;
        const ts = new Date(c.created_at).getTime();
        return ts >= startOfMonth && ts <= endOfMonth;
      });

      // 4. Orders in this month
      const monthOrders = orders.filter((o: any) => {
        if (!o.created_at) return false;
        const ts = new Date(o.created_at).getTime();
        return ts >= startOfMonth && ts <= endOfMonth;
      });

      // 5. Active subscriptions during this month (for MRR Potential)
      const activeInMonth = subs.filter((s: any) => {
        if (!s.created_at) return false;
        const createdTs = new Date(s.created_at).getTime();
        const validUntilTs = s.valid_until ? new Date(s.valid_until).getTime() : endOfMonth + 1;
        return createdTs <= endOfMonth && s.is_active && validUntilTs >= startOfMonth;
      });

      // --- RECEIVED CASH CALCULATIONS (only completed checkouts = actual cash) ---
      let monthlySubCount = 0;
      let monthlySubRevenue = 0;
      let yearlySubCount = 0;
      let yearlySubRevenue = 0;
      let autopayCount = 0;
      let autopayRevenue = 0;
      let manualCount = 0;
      let manualRevenue = 0;

      // Only completed checkouts count as received cash
      monthCheckouts.forEach((c: any) => {
        const linkedSub = subs.find((s: any) => s.user_id === c.user_id || (c.razorpay_subscription_id && s.razorpay_subscription_id === c.razorpay_subscription_id));
        const plan = getEffectivePlan(linkedSub, c);
        const amt = Number(c.total_amount || 0);

        if (plan === 'yearly') {
          yearlySubCount++;
          yearlySubRevenue += amt;
        } else {
          monthlySubCount++;
          monthlySubRevenue += amt;
        }

        if (c.razorpay_subscription_id || (linkedSub && (linkedSub.autopay_enabled || linkedSub.razorpay_subscription_id))) {
          autopayCount++;
          autopayRevenue += amt;
        } else {
          manualCount++;
          manualRevenue += amt;
        }
      });

      const ordersRev = monthOrders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0);
      const totalRev = monthlySubRevenue + yearlySubRevenue + ordersRev;
      const vendorPool = totalRev * 0.4;
      const celiteShare = totalRev * 0.6;

      // --- EXPECTED REVENUE CALCULATIONS (MRR Potential) ---
      let expectedMonthlySubCount = 0;
      let expectedMonthlyRevenue = 0;
      let expectedYearlySubCount = 0;
      let expectedYearlyRevenue = 0;
      let expectedAutopaySubscribers = 0;
      let expectedAutopayRevenue = 0;
      let expectedManualSubscribers = 0;
      let expectedManualRevenue = 0;

      activeInMonth.forEach((s: any) => {
        const plan = getEffectivePlan(s);
        const price = plan === 'yearly' ? yearlyPrice : monthlyPrice;

        if (plan === 'yearly') {
          expectedYearlySubCount++;
          expectedYearlyRevenue += price;
        } else {
          expectedMonthlySubCount++;
          expectedMonthlyRevenue += price;
        }

        if (s.autopay_enabled || s.razorpay_subscription_id) {
          expectedAutopaySubscribers++;
          expectedAutopayRevenue += price;
        } else {
          expectedManualSubscribers++;
          expectedManualRevenue += price;
        }
      });

      const expectedTotalRevenue = expectedMonthlyRevenue + expectedYearlyRevenue + ordersRev;
      const expectedVendorPool = expectedTotalRevenue * 0.4;
      const expectedCeliteShare = expectedTotalRevenue * 0.6;
      const pendingCollection = Math.max(0, expectedTotalRevenue - totalRev);
      const collectionPct = expectedTotalRevenue > 0 ? Number(((totalRev / expectedTotalRevenue) * 100).toFixed(1)) : 0;

      // --- CREATED vs UPDATED ACTIVITY ---
      let createdMonthlyCount = 0;
      let createdYearlyCount = 0;
      createdInMonth.forEach((s: any) => {
        if (getEffectivePlan(s) === 'yearly') createdYearlyCount++;
        else createdMonthlyCount++;
      });

      let updatedMonthlyCount = 0;
      let updatedYearlyCount = 0;
      updatedInMonth.forEach((s: any) => {
        if (getEffectivePlan(s) === 'yearly') updatedYearlyCount++;
        else updatedMonthlyCount++;
      });

      // --- UPCOMING AUTO-PAY PREDICTION ---
      // Active autopay subs whose valid_until is within this month but haven't renewed yet
      const upcomingAutopay = subs.filter((s: any) => {
        if (!s.is_active || !s.valid_until) return false;
        const hasAutopay = s.autopay_enabled || s.razorpay_subscription_id;
        if (!hasAutopay) return false;
        const validTs = new Date(s.valid_until).getTime();
        const updatedTs = s.updated_at ? new Date(s.updated_at).getTime() : 0;
        // valid_until is in this month AND sub hasn't been updated this month yet
        return validTs >= startOfMonth && validTs <= endOfMonth && updatedTs < startOfMonth;
      });

      const upcomingManual = subs.filter((s: any) => {
        if (!s.is_active || !s.valid_until) return false;
        if (s.autopay_enabled || s.razorpay_subscription_id) return false;
        const validTs = new Date(s.valid_until).getTime();
        const updatedTs = s.updated_at ? new Date(s.updated_at).getTime() : 0;
        return validTs >= startOfMonth && validTs <= endOfMonth && updatedTs < startOfMonth;
      });

      const upcomingAutopayCount = upcomingAutopay.length;
      const upcomingAutopayRevenue = upcomingAutopay.reduce((sum: number, s: any) => sum + (getEffectivePlan(s) === 'yearly' ? yearlyPrice : monthlyPrice), 0);
      const upcomingManualCount = upcomingManual.length;
      const upcomingManualRevenue = upcomingManual.reduce((sum: number, s: any) => sum + (getEffectivePlan(s) === 'yearly' ? yearlyPrice : monthlyPrice), 0);

      monthlySeries.push({
        monthKey,
        monthLabel,
        // Received Cash (only from completed checkouts)
        totalRevenue: Number(totalRev.toFixed(2)),
        autopayRevenue: Number(autopayRevenue.toFixed(2)),
        manualRevenue: Number(manualRevenue.toFixed(2)),
        monthlySubRevenue: Number(monthlySubRevenue.toFixed(2)),
        yearlySubRevenue: Number(yearlySubRevenue.toFixed(2)),
        ordersRevenue: Number(ordersRev.toFixed(2)),
        vendorPool: Number(vendorPool.toFixed(2)),
        celiteShare: Number(celiteShare.toFixed(2)),
        monthlySubCount,
        yearlySubCount,
        autopaySubscribers: autopayCount,
        manualSubscribers: manualCount,
        completedCheckouts: monthCheckouts.length,
        // Expected Potential
        expectedTotalRevenue: Number(expectedTotalRevenue.toFixed(2)),
        expectedAutopayRevenue: Number(expectedAutopayRevenue.toFixed(2)),
        expectedManualRevenue: Number(expectedManualRevenue.toFixed(2)),
        expectedMonthlyRevenue: Number(expectedMonthlyRevenue.toFixed(2)),
        expectedYearlyRevenue: Number(expectedYearlyRevenue.toFixed(2)),
        expectedVendorPool: Number(expectedVendorPool.toFixed(2)),
        expectedCeliteShare: Number(expectedCeliteShare.toFixed(2)),
        expectedMonthlySubCount,
        expectedYearlySubCount,
        expectedAutopaySubscribers,
        expectedManualSubscribers,
        activeSubscribers: activeInMonth.length,
        pendingCollection: Number(pendingCollection.toFixed(2)),
        collectionPct,
        // Created vs Updated Activity
        createdSubscribers: createdInMonth.length,
        updatedSubscribers: updatedInMonth.length,
        createdMonthlyCount,
        createdYearlyCount,
        updatedMonthlyCount,
        updatedYearlyCount,
        // Upcoming Auto-Pay Prediction
        upcomingAutopayCount,
        upcomingAutopayRevenue: Number(upcomingAutopayRevenue.toFixed(2)),
        upcomingManualCount,
        upcomingManualRevenue: Number(upcomingManualRevenue.toFixed(2)),
        momGrowthPct: 0,
        momAutopayGrowthPct: 0,
      });
    }

    // Compute MoM Growth %
    for (let i = 0; i < monthlySeries.length; i++) {
      if (i > 0) {
        const prev = monthlySeries[i - 1];
        const curr = monthlySeries[i];

        if (prev.totalRevenue > 0) {
          curr.momGrowthPct = Number((((curr.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100).toFixed(1));
        } else {
          curr.momGrowthPct = curr.totalRevenue > 0 ? 100 : 0;
        }

        if (prev.autopayRevenue > 0) {
          curr.momAutopayGrowthPct = Number((((curr.autopayRevenue - prev.autopayRevenue) / prev.autopayRevenue) * 100).toFixed(1));
        } else {
          curr.momAutopayGrowthPct = curr.autopayRevenue > 0 ? 100 : 0;
        }
      }
    }

    // Selected Month Data
    const selectedMonthData = monthlySeries.find((m: any) => m.monthKey === selectedMonth) || monthlySeries[monthlySeries.length - 1];

    // Build Auto-Pay Activity Log for the selected month
    const [selYearStr, selMonthStr] = selectedMonthData.monthKey.split('-');
    const selYear = parseInt(selYearStr, 10);
    const selMonth = parseInt(selMonthStr, 10);
    const selStartTs = new Date(selYear, selMonth - 1, 1).getTime();
    const selEndTs = new Date(selYear, selMonth, 0, 23, 59, 59, 999).getTime();

    // Find subscriptions or checkouts with autopay enabled during selected month
    const monthAutopayCheckouts = checkouts.filter((c: any) => {
      if (!c.created_at || c.status !== 'completed') return false;
      const ts = new Date(c.created_at).getTime();
      return ts >= selStartTs && ts <= selEndTs && (c.razorpay_subscription_id || c.autopay_enabled);
    });

    const monthAutopaySubs = subs.filter((s: any) => {
      if (!s.autopay_enabled && !s.razorpay_subscription_id) return false;
      const createdTs = s.created_at ? new Date(s.created_at).getTime() : 0;
      const updatedTs = s.updated_at ? new Date(s.updated_at).getTime() : createdTs;
      return (createdTs >= selStartTs && createdTs <= selEndTs) || (updatedTs >= selStartTs && updatedTs <= selEndTs);
    });

    // Merge log entries for selected month auto-pay activity
    const autopayLog: Array<{
      id: string;
      user_id: string;
      user_name: string;
      user_email: string;
      user_phone: string;
      plan: string;
      amount: number;
      razorpay_subscription_id: string | null;
      razorpay_payment_id: string | null;
      status: string;
      date: string;
      is_checkout: boolean;
    }> = [];

    // Add checkout logs
    monthAutopayCheckouts.forEach((c: any) => {
      const uId = c.user_id || 'unknown';
      const linkedSub = subs.find((s: any) => s.user_id === c.user_id || (c.razorpay_subscription_id && s.razorpay_subscription_id === c.razorpay_subscription_id));
      const plan = getEffectivePlan(linkedSub, c);

      autopayLog.push({
        id: c.id,
        user_id: uId,
        user_name: c.billing_name || userNames[uId] || 'Subscriber',
        user_email: c.billing_email || userEmails[uId] || 'No Email',
        user_phone: c.billing_mobile || userPhones[uId] || '',
        plan,
        amount: Number(c.total_amount || (plan === 'yearly' ? yearlyPrice : monthlyPrice)),
        razorpay_subscription_id: c.razorpay_subscription_id || null,
        razorpay_payment_id: c.razorpay_payment_id || null,
        status: c.status || 'completed',
        date: c.created_at,
        is_checkout: true,
      });
    });

    // Add subscriptions with autopay enabled if not already in log
    monthAutopaySubs.forEach((s: any) => {
      const existing = autopayLog.find((l: any) => l.user_id === s.user_id || (l.razorpay_subscription_id && l.razorpay_subscription_id === s.razorpay_subscription_id));
      if (!existing) {
        const uId = s.user_id;
        const plan = getEffectivePlan(s);
        autopayLog.push({
          id: s.id,
          user_id: uId,
          user_name: userNames[uId] || 'Subscriber',
          user_email: userEmails[uId] || 'No Email',
          user_phone: userPhones[uId] || '',
          plan,
          amount: plan === 'yearly' ? yearlyPrice : monthlyPrice,
          razorpay_subscription_id: s.razorpay_subscription_id || null,
          razorpay_payment_id: null,
          status: s.is_active ? 'active' : 'cancelled',
          date: s.updated_at || s.created_at,
          is_checkout: false,
        });
      }
    });

    // Sort log latest first
    autopayLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate month metrics summary
    const autopayPercentage = selectedMonthData.activeSubscribers > 0
      ? Math.round((selectedMonthData.expectedAutopaySubscribers / selectedMonthData.activeSubscribers) * 100)
      : 0;

    return NextResponse.json({
      ok: true,
      selectedMonth: selectedMonthData,
      autopayPercentage,
      monthlySeries,
      autopayLog,
      availableMonths: monthlySeries.map((m: any) => ({ key: m.monthKey, label: m.monthLabel })).reverse(),
      pricing: {
        monthlyPrice,
        yearlyPrice,
      },
    });
  } catch (e: any) {
    console.error('Monthly Analytics Error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to fetch monthly analytics' }, { status: 500 });
  }
}
