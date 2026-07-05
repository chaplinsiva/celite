import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // Only count subscriptions from today onwards (ignore old ones)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Fetch active subscriptions from today
    const { data: subs, error: subsErr } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, created_at, valid_until, is_active')
      .eq('is_active', true)
      .gte('created_at', todayISO)
      .order('created_at', { ascending: false });

    if (subsErr) throw subsErr;

    const activeSubs = subs || [];
    const totalActive = activeSubs.length;
    
    // Breakdown by plan
    const monthlySubs = activeSubs.filter(s => s.plan === 'monthly');
    const yearlySubs = activeSubs.filter(s => s.plan === 'yearly');
    
    // Revenue estimation (499 monthly, 4999 yearly)
    const monthlyRevenue = monthlySubs.length * 499;
    const yearlyRevenue = yearlySubs.length * 4999;
    const totalRevenue = monthlyRevenue + yearlyRevenue;

    // Get recent subscribers details
    const recentSubs = activeSubs.slice(0, 50);
    const userIds = Array.from(new Set(recentSubs.map(s => s.user_id)));

    let userMap: Record<string, { email: string; name: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users_view')
        .select('id, email, raw_user_meta_data')
        .in('id', userIds);
        
      users?.forEach(u => {
        const meta = u.raw_user_meta_data as any;
        userMap[u.id] = {
          email: u.email || 'Unknown',
          name: [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || 'Anonymous',
        };
      });
    }

    const recentSubscribersList = recentSubs.map(s => ({
      id: s.id,
      userId: s.user_id,
      email: userMap[s.user_id]?.email || 'Unknown',
      name: userMap[s.user_id]?.name || 'Anonymous',
      plan: s.plan,
      date: s.created_at,
    }));

    return NextResponse.json({
      ok: true,
      stats: {
        totalActive,
        monthlyCount: monthlySubs.length,
        yearlyCount: yearlySubs.length,
        totalRevenue
      },
      recentSubscribers: recentSubscribersList
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
