// agent-notes: { ctx: "Admin traffic sources analytics API aggregating visitor_attributions and conversion stats", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-14" }
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
    const mediumFilter = searchParams.get('medium');
    const campaignFilter = searchParams.get('campaign');

    // 1. Fetch visitor_attributions
    let query = admin
      .from('visitor_attributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    const { data: rawVisitors, error: queryErr } = await query;
    if (queryErr) {
      return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });
    }

    let records = rawVisitors || [];

    // Filter by source if specified (matches either first or last source)
    if (sourceFilter && sourceFilter !== 'all') {
      records = records.filter(
        (r) => (r.first_source || '').toLowerCase() === sourceFilter.toLowerCase() ||
               (r.last_source || '').toLowerCase() === sourceFilter.toLowerCase()
      );
    }

    // Filter by medium if specified
    if (mediumFilter && mediumFilter !== 'all') {
      records = records.filter((r) => {
        const fm = (r.first_medium || (r.first_source === 'Direct' ? 'direct' : 'organic')).toLowerCase();
        const lm = (r.last_medium || (r.last_source === 'Direct' ? 'direct' : 'organic')).toLowerCase();
        const target = mediumFilter.toLowerCase();
        return fm.includes(target) || lm.includes(target);
      });
    }

    // Filter by campaign if specified
    if (campaignFilter && campaignFilter !== 'all') {
      records = records.filter(
        (r) => (r.first_campaign || '').toLowerCase() === campaignFilter.toLowerCase() ||
               (r.last_campaign || '').toLowerCase() === campaignFilter.toLowerCase()
      );
    }

    // 2. Fetch conversions for all visitor user_ids
    const userIds = Array.from(new Set(records.map((r) => r.user_id).filter(Boolean)));
    
    // Fetch subscription_attributions (attributed subscription conversions)
    const { data: subAttributions } = userIds.length > 0
      ? await admin.from('subscription_attributions').select('*').in('user_id', userIds)
      : { data: [] };

    // Fetch subscriptions created during or after visit
    const { data: subs } = userIds.length > 0
      ? await admin.from('subscriptions').select('user_id, plan, is_active, valid_until, created_at').in('user_id', userIds)
      : { data: [] };

    // Fetch orders created during or after visit
    const { data: orders } = userIds.length > 0
      ? await admin.from('orders').select('user_id, id, created_at').in('user_id', userIds)
      : { data: [] };

    // Map conversion info per visitor record ID
    const conversionByRecordId: Record<string, {
      isConverted: boolean;
      subscriptionPlan: string | null;
      subscriptionStatus: string | null;
      hasOrder: boolean;
    }> = {};

    records.forEach((r) => {
      // 5 min buffer before first_visit_at in case timestamps differ slightly during signup flow
      const visitTime = new Date(r.first_visit_at || r.created_at).getTime() - 5 * 60 * 1000;

      const userSubAttrs = (subAttributions || []).filter((sa) => sa.user_id === r.user_id);
      const userNewSubs = (subs || []).filter(
        (s) => s.user_id === r.user_id && new Date(s.created_at).getTime() >= visitTime
      );
      const userNewOrders = (orders || []).filter(
        (o) => o.user_id === r.user_id && new Date(o.created_at).getTime() >= visitTime
      );

      const hasSubAttr = userSubAttrs.length > 0;
      const hasNewSub = userNewSubs.length > 0;
      const hasNewOrder = userNewOrders.length > 0;
      const isConverted = hasSubAttr || hasNewSub || hasNewOrder;

      const plan = userSubAttrs[0]?.subscription_plan || userNewSubs[0]?.plan || null;
      const status = hasSubAttr ? 'active' : userNewSubs[0]?.is_active ? 'active' : null;

      conversionByRecordId[r.id] = {
        isConverted,
        subscriptionPlan: plan,
        subscriptionStatus: status,
        hasOrder: hasNewOrder,
      };
    });

    // 3. Helper to determine normalized medium
    const getNormalizedMedium = (medium: string | null, source: string | null): string => {
      if (medium && medium.trim()) return medium.toLowerCase();
      const s = (source || '').toLowerCase();
      if (s === 'direct' || !s) return 'direct';
      if (s.includes('organic')) return 'organic';
      if (s.includes('social') || s.includes('instagram') || s.includes('youtube') || s.includes('facebook') || s.includes('twitter') || s.includes('tiktok') || s.includes('threads')) return 'social';
      if (s.includes('cpc') || s.includes('ad') || s.includes('paid')) return 'cpc';
      if (s.includes('email') || s.includes('newsletter')) return 'email';
      return 'referral';
    };

    // 4. Aggregations
    const totalVisitors = records.length;
    let totalConverted = 0;
    let multiTouchCount = 0;

    const sourceMap: Record<string, {
      source: string;
      firstTouchCount: number;
      lastTouchCount: number;
      totalUniqueUsers: Set<string>;
      conversions: number;
      mediums: Record<string, number>;
      landingPages: Record<string, number>;
      campaigns: Record<string, number>;
    }> = {};

    const mediumMap: Record<string, {
      medium: string;
      count: number;
      conversions: number;
    }> = {};

    const campaignMap: Record<string, {
      campaign: string;
      source: string;
      medium: string;
      visitors: number;
      conversions: number;
    }> = {};

    const landingPageMap: Record<string, {
      path: string;
      visitors: number;
      conversions: number;
      sources: Record<string, number>;
    }> = {};

    const productMap: Record<string, {
      product: string;
      visitors: number;
      conversions: number;
      sources: Record<string, number>;
    }> = {};

    const referrerMap: Record<string, {
      referrer: string;
      count: number;
    }> = {};

    const journeyMap: Record<string, {
      firstSource: string;
      lastSource: string;
      path: string;
      count: number;
      conversions: number;
    }> = {};

    // Helper to format clean landing page
    const cleanLandingPath = (urlStr: string | null): string => {
      if (!urlStr) return '/';
      try {
        if (urlStr.startsWith('http')) {
          const u = new URL(urlStr);
          return u.pathname || '/';
        }
        return urlStr.split('?')[0] || '/';
      } catch {
        return urlStr.split('?')[0] || '/';
      }
    };

    // Helper to format referrer domain
    const cleanReferrer = (refStr: string | null): string => {
      if (!refStr) return 'Direct / None';
      try {
        const u = new URL(refStr);
        return u.hostname.replace(/^www\./, '');
      } catch {
        return refStr;
      }
    };

    records.forEach((r) => {
      const fSource = r.first_source || 'Direct';
      const lSource = r.last_source || fSource;
      const fMedium = getNormalizedMedium(r.first_medium, fSource);
      const fCampaign = r.first_campaign || '(none)';
      const cleanLanding = cleanLandingPath(r.first_landing_page);
      const cleanRef = cleanReferrer(r.first_referrer);
      const product = r.first_product_viewed || r.last_product_viewed || null;

      const convInfo = conversionByRecordId[r.id];
      const isConverted = !!convInfo?.isConverted;
      if (isConverted) totalConverted += 1;

      const isMultiTouch = (fSource.toLowerCase() !== lSource.toLowerCase()) ||
                           (r.first_visit_at && r.last_visit_at && r.first_visit_at !== r.last_visit_at);
      if (isMultiTouch) multiTouchCount += 1;

      // First-Touch Source aggregation
      if (!sourceMap[fSource]) {
        sourceMap[fSource] = {
          source: fSource,
          firstTouchCount: 0,
          lastTouchCount: 0,
          totalUniqueUsers: new Set(),
          conversions: 0,
          mediums: {},
          landingPages: {},
          campaigns: {},
        };
      }
      sourceMap[fSource].firstTouchCount += 1;
      sourceMap[fSource].totalUniqueUsers.add(r.user_id);
      if (isConverted) sourceMap[fSource].conversions += 1;
      sourceMap[fSource].mediums[fMedium] = (sourceMap[fSource].mediums[fMedium] || 0) + 1;
      sourceMap[fSource].landingPages[cleanLanding] = (sourceMap[fSource].landingPages[cleanLanding] || 0) + 1;
      if (fCampaign !== '(none)') {
        sourceMap[fSource].campaigns[fCampaign] = (sourceMap[fSource].campaigns[fCampaign] || 0) + 1;
      }

      // Last-Touch Source aggregation
      if (!sourceMap[lSource]) {
        sourceMap[lSource] = {
          source: lSource,
          firstTouchCount: 0,
          lastTouchCount: 0,
          totalUniqueUsers: new Set(),
          conversions: 0,
          mediums: {},
          landingPages: {},
          campaigns: {},
        };
      }
      sourceMap[lSource].lastTouchCount += 1;
      sourceMap[lSource].totalUniqueUsers.add(r.user_id);

      // Medium Map
      if (!mediumMap[fMedium]) {
        mediumMap[fMedium] = { medium: fMedium, count: 0, conversions: 0 };
      }
      mediumMap[fMedium].count += 1;
      if (isConverted) mediumMap[fMedium].conversions += 1;

      // Campaign Map
      if (fCampaign !== '(none)') {
        const cKey = `${fCampaign}___${fSource}`;
        if (!campaignMap[cKey]) {
          campaignMap[cKey] = {
            campaign: fCampaign,
            source: fSource,
            medium: fMedium,
            visitors: 0,
            conversions: 0,
          };
        }
        campaignMap[cKey].visitors += 1;
        if (isConverted) campaignMap[cKey].conversions += 1;
      }

      // Landing Page Map
      if (!landingPageMap[cleanLanding]) {
        landingPageMap[cleanLanding] = { path: cleanLanding, visitors: 0, conversions: 0, sources: {} };
      }
      landingPageMap[cleanLanding].visitors += 1;
      if (isConverted) landingPageMap[cleanLanding].conversions += 1;
      landingPageMap[cleanLanding].sources[fSource] = (landingPageMap[cleanLanding].sources[fSource] || 0) + 1;

      // Product Map
      if (product) {
        if (!productMap[product]) {
          productMap[product] = { product, visitors: 0, conversions: 0, sources: {} };
        }
        productMap[product].visitors += 1;
        if (isConverted) productMap[product].conversions += 1;
        productMap[product].sources[fSource] = (productMap[product].sources[fSource] || 0) + 1;
      }

      // Referrer Map
      referrerMap[cleanRef] = {
        referrer: cleanRef,
        count: (referrerMap[cleanRef]?.count || 0) + 1,
      };

      // Multi-Touch Journey Map
      const jKey = `${fSource} ➔ ${lSource}`;
      if (!journeyMap[jKey]) {
        journeyMap[jKey] = {
          firstSource: fSource,
          lastSource: lSource,
          path: jKey,
          count: 0,
          conversions: 0,
        };
      }
      journeyMap[jKey].count += 1;
      if (isConverted) journeyMap[jKey].conversions += 1;
    });

    // Format Sources Array
    const sourcesList = Object.values(sourceMap)
      .map((s) => {
        const topMed = Object.entries(s.mediums).sort((a, b) => b[1] - a[1])[0]?.[0] || 'organic';
        const topLand = Object.entries(s.landingPages).sort((a, b) => b[1] - a[1])[0]?.[0] || '/';
        const topCamp = Object.entries(s.campaigns).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        const convRate = s.firstTouchCount > 0 ? ((s.conversions / s.firstTouchCount) * 100).toFixed(1) : '0.0';
        return {
          source: s.source,
          firstTouchCount: s.firstTouchCount,
          lastTouchCount: s.lastTouchCount,
          uniqueUsersCount: s.totalUniqueUsers.size,
          percentage: totalVisitors > 0 ? ((s.firstTouchCount / totalVisitors) * 100).toFixed(1) : '0.0',
          conversions: s.conversions,
          conversionRate: Number(convRate),
          topMedium: topMed,
          topLandingPage: topLand,
          topCampaign: topCamp,
        };
      })
      .sort((a, b) => b.firstTouchCount - a.firstTouchCount);

    // Format Mediums Array
    const mediumsList = Object.values(mediumMap)
      .map((m) => ({
        medium: m.medium,
        count: m.count,
        percentage: totalVisitors > 0 ? Number(((m.count / totalVisitors) * 100).toFixed(1)) : 0,
        conversions: m.conversions,
        conversionRate: m.count > 0 ? Number(((m.conversions / m.count) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Format Campaigns Array
    const campaignsList = Object.values(campaignMap)
      .map((c) => ({
        campaign: c.campaign,
        source: c.source,
        medium: c.medium,
        visitors: c.visitors,
        conversions: c.conversions,
        conversionRate: c.visitors > 0 ? Number(((c.conversions / c.visitors) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    // Format Landing Pages Array
    const landingPagesList = Object.values(landingPageMap)
      .map((l) => {
        const topSrc = Object.entries(l.sources).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Direct';
        return {
          path: l.path,
          visitors: l.visitors,
          conversions: l.conversions,
          conversionRate: l.visitors > 0 ? Number(((l.conversions / l.visitors) * 100).toFixed(1)) : 0,
          topSource: topSrc,
        };
      })
      .sort((a, b) => b.visitors - a.visitors);

    // Format Products Array
    const productsList = Object.values(productMap)
      .map((p) => {
        const topSrc = Object.entries(p.sources).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Direct';
        return {
          product: p.product,
          visitors: p.visitors,
          conversions: p.conversions,
          conversionRate: p.visitors > 0 ? Number(((p.conversions / p.visitors) * 100).toFixed(1)) : 0,
          topSource: topSrc,
        };
      })
      .sort((a, b) => b.visitors - a.visitors);

    // Format Referrers Array
    const referrersList = Object.values(referrerMap)
      .map((r) => ({
        referrer: r.referrer,
        count: r.count,
        percentage: totalVisitors > 0 ? Number(((r.count / totalVisitors) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Format Journeys Array
    const journeysList = Object.values(journeyMap)
      .sort((a, b) => b.count - a.count);

    // Format Visitor Logs (enriched with conversion info)
    const visitorLogs = records.slice(0, 100).map((r) => {
      const conv = conversionByRecordId[r.id];
      return {
        id: r.id,
        userId: r.user_id,
        anonymousId: r.anonymous_id,
        firstSource: r.first_source || 'Direct',
        firstMedium: r.first_medium || '—',
        firstCampaign: r.first_campaign || '—',
        firstContent: r.first_content || '—',
        firstTerm: r.first_term || '—',
        firstLandingPage: r.first_landing_page || '/',
        firstReferrer: r.first_referrer || '—',
        firstProductViewed: r.first_product_viewed || '—',
        firstVisitAt: r.first_visit_at || r.created_at,
        lastSource: r.last_source || r.first_source || 'Direct',
        lastMedium: r.last_medium || '—',
        lastCampaign: r.last_campaign || '—',
        lastContent: r.last_content || '—',
        lastLandingPage: r.last_landing_page || '/',
        lastReferrer: r.last_referrer || '—',
        lastProductViewed: r.last_product_viewed || '—',
        lastVisitAt: r.last_visit_at || r.created_at,
        createdAt: r.created_at,
        hasConverted: !!conv?.isConverted,
        subscriptionPlan: conv?.subscriptionPlan || null,
        subscriptionStatus: conv?.subscriptionStatus || null,
      };
    });

    const topSource = sourcesList[0]?.source || 'None';
    const topMedium = mediumsList[0]?.medium || 'None';
    const topLanding = landingPagesList[0]?.path || '/';
    const overallConversionRate = totalVisitors > 0 ? Number(((totalConverted / totalVisitors) * 100).toFixed(1)) : 0;
    const multiTouchPercentage = totalVisitors > 0 ? Number(((multiTouchCount / totalVisitors) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          totalVisitors,
          totalConverted,
          overallConversionRate,
          multiTouchCount,
          multiTouchPercentage,
          topSource,
          topSourceShare: sourcesList[0]?.percentage || '0',
          topMedium,
          topLandingPage: topLanding,
        },
        sources: sourcesList,
        mediums: mediumsList,
        campaigns: campaignsList,
        landingPages: landingPagesList,
        products: productsList,
        referrers: referrersList,
        journeys: journeysList,
        visitorLogs,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Traffic Analytics API error:', error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
