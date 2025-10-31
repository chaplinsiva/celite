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

    // Orders and items
    const ordersRes = await admin.from('orders')
      .select('id,user_id,created_at,total,status')
      .order('created_at', { ascending: false })
      .limit(200);
    if (ordersRes.error) return NextResponse.json({ ok: false, error: ordersRes.error.message }, { status: 500 });
    const orderIds = (ordersRes.data ?? []).map((o: any) => o.id);
    let items: any[] = [];
    if (orderIds.length) {
      const itemsRes = await admin.from('order_items')
        .select('order_id,name,quantity,price')
        .in('order_id', orderIds);
      if (itemsRes.error) return NextResponse.json({ ok: false, error: itemsRes.error.message }, { status: 500 });
      items = itemsRes.data ?? [];
    }

    // Subscriptions
    const subsRes = await admin.from('subscriptions')
      .select('user_id,is_active,plan,valid_until,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (subsRes.error) return NextResponse.json({ ok: false, error: subsRes.error.message }, { status: 500 });

    // Aggregates
    const totalOrderRevenue = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const totalOrders = (ordersRes.data ?? []).length;
    const activeList = (subsRes.data ?? []).filter((s: any) => s.is_active && (!s.valid_until || new Date(s.valid_until).getTime() > Date.now()));
    const activeSubscribers = activeList.length;
    const activeMonthly = activeList.filter((s: any) => s.plan === 'monthly').length;
    const activeYearly = activeList.filter((s: any) => s.plan === 'yearly').length;
    // Estimate subscription revenue: Monthly Recurring Revenue (MRR)
    const subscriptionMRR = activeMonthly * 10 + activeYearly * (100 / 12);

    return NextResponse.json({
      ok: true,
      totals: {
        orderRevenue: totalOrderRevenue,
        subscriptionRevenue: Number(subscriptionMRR.toFixed(2)),
        orders: totalOrders,
        activeSubscribers,
        activeMonthly,
        activeYearly,
      },
      orders: ordersRes.data ?? [],
      order_items: items,
      subscriptions: subsRes.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


