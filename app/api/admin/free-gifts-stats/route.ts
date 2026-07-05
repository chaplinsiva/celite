import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // Only count downloads from today onwards (ignore old data)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // 1. Get free downloads from today onwards
    const { data: downloads, error: dlErr } = await supabase
      .from('free_downloads')
      .select('user_id, template_slug, downloaded_at')
      .gte('downloaded_at', todayISO)
      .order('downloaded_at', { ascending: false })
      .limit(200);

    if (dlErr) throw dlErr;

    const allDownloads = downloads || [];
    const totalDownloads = allDownloads.length;

    // 2. Unique users
    const uniqueUserIds = Array.from(new Set(allDownloads.map(d => d.user_id).filter(Boolean)));
    const uniqueUsers = uniqueUserIds.length;

    // 3. Check subscriptions (converted users)
    let convertedUsers = 0;
    const subscribedSet = new Set<string>();
    if (uniqueUserIds.length > 0) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('is_active', true)
        .in('user_id', uniqueUserIds);
      convertedUsers = subs?.length || 0;
      subs?.forEach(s => subscribedSet.add(s.user_id));
    }

    const conversionRate = uniqueUsers > 0 ? (convertedUsers / uniqueUsers) * 100 : 0;

    // 4. Top 10 templates by download count
    const templateCounts: Record<string, number> = {};
    allDownloads.forEach(d => {
      templateCounts[d.template_slug] = (templateCounts[d.template_slug] || 0) + 1;
    });

    // Get template names for the slugs we have
    const slugsWithDownloads = Object.keys(templateCounts);
    let templateNameMap: Record<string, string> = {};
    if (slugsWithDownloads.length > 0) {
      const { data: tpls } = await supabase
        .from('templates')
        .select('slug, name')
        .in('slug', slugsWithDownloads);
      tpls?.forEach(t => { templateNameMap[t.slug] = t.name; });
    }

    const topGifts = Object.entries(templateCounts)
      .map(([slug, count]) => ({ slug, name: templateNameMap[slug] || slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Recent downloads with user info (only fetch needed user IDs)
    const recentDownloads = allDownloads.slice(0, 50);
    const recentUserIds = Array.from(new Set(recentDownloads.map(d => d.user_id).filter(Boolean)));

    let userMap: Record<string, { email: string; name: string }> = {};
    if (recentUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users_view')
        .select('id, email, raw_user_meta_data')
        .in('id', recentUserIds);
      users?.forEach(u => {
        const meta = u.raw_user_meta_data as any;
        userMap[u.id] = {
          email: u.email || 'Unknown',
          name: [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || 'Anonymous',
        };
      });
    }

    const userDownloads = recentDownloads.map(dl => ({
      id: dl.user_id,
      email: userMap[dl.user_id]?.email || 'Unknown User',
      name: userMap[dl.user_id]?.name || 'Anonymous',
      templateName: templateNameMap[dl.template_slug] || dl.template_slug,
      date: dl.downloaded_at,
      isConverted: subscribedSet.has(dl.user_id),
    }));

    return NextResponse.json({
      ok: true,
      stats: { totalDownloads, uniqueUsers, convertedUsers, conversionRate },
      topGifts,
      userDownloads,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
