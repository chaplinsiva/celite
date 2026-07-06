import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // Get the offer start date from settings (configurable)
    // This tracks subscriptions from when the 3rd Anniversary offer began
    let offerStartISO: string | null = null;
    try {
      const { data: settings } = await supabase.from('settings').select('key,value');
      if (settings) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((row: any) => { settingsMap[row.key] = row.value; });
        if (settingsMap.SPECIAL_OFFER_START_DATE) {
          // Parse the configured start date
          const startDate = new Date(settingsMap.SPECIAL_OFFER_START_DATE);
          if (!isNaN(startDate.getTime())) {
            offerStartISO = startDate.toISOString();
          }
        }
      }
    } catch (e) {
      console.log('Could not fetch SPECIAL_OFFER_START_DATE from settings');
    }

    const nowISO = new Date().toISOString();

    // Fetch active subscriptions since the offer started
    // If no start date is configured, show all active subscriptions
    let subsQuery = supabase
      .from('subscriptions')
      .select('id, user_id, plan, created_at, valid_until, is_active')
      .eq('is_active', true)
      .or(`valid_until.is.null,valid_until.gt.${nowISO}`)
      .order('created_at', { ascending: false });

    // Only filter by offer start date if configured
    if (offerStartISO) {
      subsQuery = subsQuery.gte('created_at', offerStartISO);
    }

    const { data: subs, error: subsErr } = await subsQuery;

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
      recentSubscribers: recentSubscribersList,
      offerStartDate: offerStartISO || null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
