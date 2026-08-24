// agent-notes: { ctx: "Admin API to fetch complete customer journey timeline for a checkout or user with resolved registry names", deps: ["lib/supabaseAdmin.ts", "lib/attribution.ts"], state: active, last: "sato@2026-08-16" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../../lib/supabaseAdmin';
import { resolveContentNames, type RegistryMapping } from '../../../../../../lib/attribution';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', me.user.id).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!id) return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });

    // Fetch marketing registry for name resolution
    const { data: rawRegistry } = await admin.from('marketing_sources_registry').select('*');
    const registry: RegistryMapping[] = rawRegistry || [];

    // Find checkout or subscription snapshot
    let userId: string | null = null;
    let anonymousId: string | null = null;
    let checkoutData: Record<string, unknown> | null = null;
    let subscriptionAttr: Record<string, unknown> | null = null;

    // 1. Try checking checkout_details
    const { data: checkout } = await admin
      .from('checkout_details')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (checkout) {
      checkoutData = checkout as Record<string, unknown>;
      userId = checkout.user_id;
    } else {
      // Maybe id is user_id
      userId = id;
    }

    // 2. Fetch subscription attribution snapshot if exists
    if (checkoutData?.id) {
      const { data: snap } = await admin
        .from('subscription_attributions')
        .select('*')
        .eq('checkout_detail_id', checkoutData.id)
        .maybeSingle();
      subscriptionAttr = snap as Record<string, unknown> | null;
    }
    if (!subscriptionAttr && userId) {
      const { data: snap } = await admin
        .from('subscription_attributions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      subscriptionAttr = snap as Record<string, unknown> | null;
    }

    // 3. Fetch visitor_attributions for user
    let visitorAttr: Record<string, unknown> | null = null;
    if (userId) {
      const { data: vAttr } = await admin
        .from('visitor_attributions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      visitorAttr = vAttr as Record<string, unknown> | null;
      if (vAttr?.anonymous_id) {
        anonymousId = vAttr.anonymous_id;
      }
    }

    // 4. Fetch granular chronological touchpoints
    let touchpointsQuery = admin
      .from('visitor_touchpoints')
      .select('*')
      .order('created_at', { ascending: true });

    if (userId && anonymousId) {
      touchpointsQuery = touchpointsQuery.or(`user_id.eq.${userId},anonymous_id.eq.${anonymousId}`);
    } else if (userId) {
      touchpointsQuery = touchpointsQuery.eq('user_id', userId);
    } else if (anonymousId) {
      touchpointsQuery = touchpointsQuery.eq('anonymous_id', anonymousId);
    }

    const { data: rawTouchpoints } = await touchpointsQuery;
    const touchpoints = (rawTouchpoints || []).map((tp) => {
      const resolved = resolveContentNames(
        {
          campaign: tp.campaign,
          campaign_id: tp.campaign_id,
          content: tp.content,
          content_id: tp.content_id,
          source: tp.source,
        },
        registry
      );

      return {
        ...tp,
        resolved_campaign_name: resolved.campaign_name,
        resolved_content_name: resolved.content_name,
        resolved_adset_name: resolved.adset_name,
      };
    });

    return NextResponse.json({
      ok: true,
      checkout: checkoutData,
      subscriptionAttribution: subscriptionAttr,
      visitorAttribution: visitorAttr,
      timeline: touchpoints,
    });
  } catch (e: unknown) {
    console.error('Customer journey fetch error:', e);
    const msg = e instanceof Error ? e.message : 'Error fetching journey';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
