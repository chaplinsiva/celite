import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdminClient();

    // --- Pagination params ---
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get('pageSize') || '20', 10)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // --- Get campaign start date from settings (3rd Anniversary start date) ---
    let campaignStartISO: string | null = null;
    try {
      const { data: settings } = await supabase.from('settings').select('key,value');
      if (settings) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((row: any) => { settingsMap[row.key] = row.value; });
        if (settingsMap.SPECIAL_OFFER_START_DATE) {
          const startDate = new Date(settingsMap.SPECIAL_OFFER_START_DATE);
          if (!isNaN(startDate.getTime())) {
            campaignStartISO = startDate.toISOString();
          }
        }
      }
    } catch (e) {
      console.log('[free-gifts-stats] Could not fetch SPECIAL_OFFER_START_DATE from settings');
    }

    // Fall back to midnight today if no campaign start date is configured
    if (!campaignStartISO) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      campaignStartISO = today.toISOString();
    }

    // ── QUERY A: Lightweight full-scan for stats (user_id + template_slug only) ──
    // No row limit — stats must be accurate across the entire campaign period.
    const { data: allDownloadsRaw, error: allErr } = await supabase
      .from('free_downloads')
      .select('user_id, template_slug')
      .gte('downloaded_at', campaignStartISO);

    if (allErr) throw allErr;

    const allDownloads = allDownloadsRaw || [];
    const totalDownloads = allDownloads.length;

    // Unique users across full campaign
    const uniqueUserIds = Array.from(new Set(allDownloads.map(d => d.user_id).filter(Boolean)));
    const uniqueUsers = uniqueUserIds.length;

    // Conversion = user has EVER subscribed (any plan, any status).
    // We don't filter by is_active / valid_until here because:
    //   - A user who subscribed and then cancelled still counts as converted.
    // For the per-row badge we separately track "active right now".
    let convertedUsers = 0;
    const everSubscribedSet = new Set<string>(); // drives "Converted to Sub" count
    const activeNowSet = new Set<string>();       // drives "Active Subscriber" badge per row
    if (uniqueUserIds.length > 0) {
      const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('user_id, is_active, valid_until')
        .in('user_id', uniqueUserIds);

      const nowISO = new Date().toISOString();
      allSubs?.forEach(s => {
        everSubscribedSet.add(s.user_id);
        const isActiveNow = s.is_active && (!s.valid_until || s.valid_until > nowISO);
        if (isActiveNow) activeNowSet.add(s.user_id);
      });
      convertedUsers = everSubscribedSet.size;
    }

    const conversionRate = uniqueUsers > 0 ? (convertedUsers / uniqueUsers) * 100 : 0;

    // Top 10 templates by download count (from full scan)
    const templateCounts: Record<string, number> = {};
    allDownloads.forEach(d => {
      templateCounts[d.template_slug] = (templateCounts[d.template_slug] || 0) + 1;
    });

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

    // ── QUERY B: Paginated rows for the table (with timestamps) ──
    const { data: pageDownloads, error: pageErr, count: exactCount } = await supabase
      .from('free_downloads')
      .select('user_id, template_slug, downloaded_at', { count: 'exact' })
      .gte('downloaded_at', campaignStartISO)
      .order('downloaded_at', { ascending: false })
      .range(from, to);

    if (pageErr) throw pageErr;

    const pageRows = pageDownloads || [];
    const totalRecords = exactCount ?? totalDownloads;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

    // Fetch user info only for this page's user IDs
    const pageUserIds = Array.from(new Set(pageRows.map(d => d.user_id).filter(Boolean)));
    let userMap: Record<string, { email: string; name: string }> = {};
    if (pageUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users_view')
        .select('id, email, raw_user_meta_data')
        .in('id', pageUserIds);
      users?.forEach(u => {
        const meta = u.raw_user_meta_data as any;
        userMap[u.id] = {
          email: u.email || 'Unknown',
          name: [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || 'Anonymous',
        };
      });
    }

    // Fetch template names for page slugs not already in map
    const pageSlugs = Array.from(
      new Set(pageRows.map(d => d.template_slug).filter(s => !templateNameMap[s]))
    );
    if (pageSlugs.length > 0) {
      const { data: extraTpls } = await supabase
        .from('templates')
        .select('slug, name')
        .in('slug', pageSlugs);
      extraTpls?.forEach(t => { templateNameMap[t.slug] = t.name; });
    }

    const userDownloads = pageRows.map(dl => ({
      userId: dl.user_id,
      email: userMap[dl.user_id]?.email || 'Unknown User',
      name: userMap[dl.user_id]?.name || 'Anonymous',
      templateName: templateNameMap[dl.template_slug] || dl.template_slug,
      templateSlug: dl.template_slug,
      date: dl.downloaded_at,
      isConverted: everSubscribedSet.has(dl.user_id),
      isActiveNow: activeNowSet.has(dl.user_id),
    }));

    return NextResponse.json({
      ok: true,
      stats: { totalDownloads, uniqueUsers, convertedUsers, conversionRate },
      topGifts,
      userDownloads,
      pagination: { page, pageSize, totalRecords, totalPages },
      campaignStartDate: campaignStartISO,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
