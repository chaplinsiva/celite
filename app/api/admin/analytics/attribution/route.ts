// agent-notes: { ctx: "Universal Admin attribution analytics API for multi-touch ROI, campaign hierarchy, assisted conversions, and registry resolution", deps: ["lib/supabaseAdmin.ts", "lib/attribution.ts"], state: active, last: "sato@2026-08-16" }
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
    const sourceFilter = searchParams.get('source');
    const planFilter = searchParams.get('plan');
    const campaignFilter = searchParams.get('campaign');

    // 1. Fetch Marketing Sources Registry mappings
    const { data: rawRegistry } = await admin.from('marketing_sources_registry').select('*');
    const registry: RegistryMapping[] = rawRegistry || [];

    // 2. Fetch Subscription Attribution Snapshots
    let query = admin
      .from('subscription_attributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
    if (planFilter && planFilter !== 'all') {
      query = query.eq('subscription_plan', planFilter);
    }

    const { data: rawAttributions, error: queryErr } = await query;
    if (queryErr) {
      return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });
    }

    let records = rawAttributions || [];

    // Filter by source if specified (matches either first or last source)
    if (sourceFilter && sourceFilter !== 'all') {
      records = records.filter(
        (r) => r.first_source === sourceFilter || r.last_source === sourceFilter
      );
    }

    // Filter by campaign if specified
    if (campaignFilter && campaignFilter !== 'all') {
      records = records.filter(
        (r) => r.first_campaign === campaignFilter || r.last_campaign === campaignFilter
      );
    }

    // 3. Aggregate Core Summary
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;

    const firstSourceMap: Record<string, { source: string; customers: number; revenue: number; monthly: number; yearly: number }> = {};
    const lastSourceMap: Record<string, { source: string; customers: number; revenue: number; monthly: number; yearly: number }> = {};
    const campaignMap: Record<string, {
      campaign: string;
      campaignId?: string | null;
      source: string;
      medium: string;
      customers: number;
      revenue: number;
      monthly: number;
      yearly: number;
    }> = {};
    const creativeMap: Record<string, {
      name: string;
      id: string;
      campaignName: string;
      source: string;
      subscriptions: number;
      revenue: number;
    }> = {};
    const referralDomainMap: Record<string, { domain: string; url: string; visitors: number; revenue: number }> = {};
    const productMap: Record<string, { product: string; firstTouchCount: number; lastTouchCount: number; subscriptions: number; revenue: number }> = {};
    const assistedMap: Record<string, { firstSource: string; lastSource: string; path: string; count: number; revenue: number }> = {};
    const directInvestigation = {
      genuineDirect: { count: 0, revenue: 0 },
      previouslyAttributed: { count: 0, revenue: 0, origins: {} as Record<string, number> },
      unknownMissingReferrer: { count: 0, revenue: 0 },
    };
    const confidenceBreakdown = {
      high: 0,
      medium: 0,
      low: 0,
    };

    records.forEach((r) => {
      const amt = Number(r.amount || 0);
      totalRevenue += amt;
      const plan = (r.subscription_plan || '').toLowerCase();
      const isYearly = plan === 'yearly';

      if (isYearly) {
        yearlyRevenue += amt;
        yearlyCount += 1;
      } else {
        monthlyRevenue += amt;
        monthlyCount += 1;
      }

      const fSource = r.first_source || 'Direct';
      const lSource = r.last_source || fSource || 'Direct';

      // Confidence
      const conf = (r.confidence_level || 'medium').toLowerCase() as 'high' | 'medium' | 'low';
      if (confidenceBreakdown[conf] !== undefined) {
        confidenceBreakdown[conf] += 1;
      }

      // First Touch Aggregation
      if (!firstSourceMap[fSource]) {
        firstSourceMap[fSource] = { source: fSource, customers: 0, revenue: 0, monthly: 0, yearly: 0 };
      }
      firstSourceMap[fSource].customers += 1;
      firstSourceMap[fSource].revenue += amt;
      if (isYearly) firstSourceMap[fSource].yearly += 1;
      else firstSourceMap[fSource].monthly += 1;

      // Last Touch Aggregation
      if (!lastSourceMap[lSource]) {
        lastSourceMap[lSource] = { source: lSource, customers: 0, revenue: 0, monthly: 0, yearly: 0 };
      }
      lastSourceMap[lSource].customers += 1;
      lastSourceMap[lSource].revenue += amt;
      if (isYearly) lastSourceMap[lSource].yearly += 1;
      else lastSourceMap[lSource].monthly += 1;

      // Campaign & Creative Hierarchy Resolution
      const rawCamp = r.first_campaign || r.last_campaign;
      const rawCampId = r.first_campaign_id || r.first_meta_campaign_id;
      const rawContent = r.first_content || r.last_content || r.first_meta_ad_name || r.first_youtube_video_name;
      const rawContentId = r.first_content_id || r.first_meta_ad_id || r.first_youtube_video_id;

      const resolved = resolveContentNames(
        {
          campaign: rawCamp,
          campaign_id: rawCampId,
          content: rawContent,
          content_id: rawContentId,
          source: fSource,
        },
        registry
      );

      const campaignName = resolved.campaign_name || rawCamp || 'Untagged Campaign';
      if (rawCamp || rawCampId) {
        if (!campaignMap[campaignName]) {
          campaignMap[campaignName] = {
            campaign: campaignName,
            campaignId: rawCampId || null,
            source: fSource,
            medium: r.first_medium || 'Paid',
            customers: 0,
            revenue: 0,
            monthly: 0,
            yearly: 0,
          };
        }
        campaignMap[campaignName].customers += 1;
        campaignMap[campaignName].revenue += amt;
        if (isYearly) campaignMap[campaignName].yearly += 1;
        else campaignMap[campaignName].monthly += 1;
      }

      if (resolved.content_name || rawContentId) {
        const creativeKey = resolved.content_name || rawContentId || 'Unknown Creative';
        if (!creativeMap[creativeKey]) {
          creativeMap[creativeKey] = {
            name: creativeKey,
            id: rawContentId || '',
            campaignName,
            source: fSource,
            subscriptions: 0,
            revenue: 0,
          };
        }
        creativeMap[creativeKey].subscriptions += 1;
        creativeMap[creativeKey].revenue += amt;
      }

      // Referral Websites
      if (fSource === 'Referral' || lSource === 'Referral') {
        const refUrl = r.first_referrer || r.last_referrer || 'Direct';
        let domain = 'Referral';
        try {
          domain = new URL(refUrl).hostname;
        } catch {
          domain = refUrl;
        }
        if (!referralDomainMap[domain]) {
          referralDomainMap[domain] = { domain, url: refUrl, visitors: 0, revenue: 0 };
        }
        referralDomainMap[domain].visitors += 1;
        referralDomainMap[domain].revenue += amt;
      }

      // Product Attribution
      if (r.first_product_viewed) {
        const p = r.first_product_viewed;
        if (!productMap[p]) productMap[p] = { product: p, firstTouchCount: 0, lastTouchCount: 0, subscriptions: 0, revenue: 0 };
        productMap[p].firstTouchCount += 1;
      }
      if (r.last_product_viewed) {
        const p = r.last_product_viewed;
        if (!productMap[p]) productMap[p] = { product: p, firstTouchCount: 0, lastTouchCount: 0, subscriptions: 0, revenue: 0 };
        productMap[p].lastTouchCount += 1;
        productMap[p].subscriptions += 1;
        productMap[p].revenue += amt;
      }

      // Assisted Conversions (Different discovery source vs converting source)
      if (fSource !== lSource) {
        const pathKey = `${fSource} → ${lSource}`;
        if (!assistedMap[pathKey]) {
          assistedMap[pathKey] = {
            firstSource: fSource,
            lastSource: lSource,
            path: pathKey,
            count: 0,
            revenue: 0,
          };
        }
        assistedMap[pathKey].count += 1;
        assistedMap[pathKey].revenue += amt;
      }

      // Direct / Unknown Deep Investigation
      if (lSource === 'Direct' || lSource === 'Genuine Direct' || lSource === 'Direct (Previously Attributed)') {
        if (fSource !== 'Direct' && fSource !== 'Genuine Direct') {
          directInvestigation.previouslyAttributed.count += 1;
          directInvestigation.previouslyAttributed.revenue += amt;
          directInvestigation.previouslyAttributed.origins[fSource] =
            (directInvestigation.previouslyAttributed.origins[fSource] || 0) + 1;
        } else {
          directInvestigation.genuineDirect.count += 1;
          directInvestigation.genuineDirect.revenue += amt;
        }
      } else if (lSource.includes('Unknown')) {
        directInvestigation.unknownMissingReferrer.count += 1;
        directInvestigation.unknownMissingReferrer.revenue += amt;
      }
    });

    const totalSubscriptions = records.length;
    const avgOrderValue = totalSubscriptions > 0 ? Math.round(totalRevenue / totalSubscriptions) : 0;

    const firstTouchBreakdown = Object.values(firstSourceMap)
      .map((s) => ({
        ...s,
        avgOrderValue: s.customers > 0 ? Math.round(s.revenue / s.customers) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const lastTouchBreakdown = Object.values(lastSourceMap)
      .map((s) => ({
        ...s,
        avgOrderValue: s.customers > 0 ? Math.round(s.revenue / s.customers) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const campaignBreakdown = Object.values(campaignMap)
      .map((c) => ({
        ...c,
        avgOrderValue: c.customers > 0 ? Math.round(c.revenue / c.customers) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const creativeBreakdown = Object.values(creativeMap).sort((a, b) => b.revenue - a.revenue);
    const referralBreakdown = Object.values(referralDomainMap).sort((a, b) => b.revenue - a.revenue);
    const productBreakdown = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
    const assistedConversions = Object.values(assistedMap).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      ok: true,
      summary: {
        totalSubscriptions,
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue,
        monthlyCount,
        yearlyCount,
        avgOrderValue,
      },
      firstTouchBreakdown,
      lastTouchBreakdown,
      assistedConversions,
      campaignBreakdown,
      creativeBreakdown,
      referralBreakdown,
      productBreakdown,
      directInvestigation,
      confidenceBreakdown,
      recentRecords: records.slice(0, 50),
    });
  } catch (e: unknown) {
    console.error('Attribution analytics error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
