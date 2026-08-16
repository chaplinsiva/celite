// agent-notes: { ctx: "Universal Attribution sync API endpoint for linking anonymous visitor touchpoints & customer journey to authenticated users", deps: ["lib/supabaseAdmin.ts", "lib/attribution.ts"], state: active, last: "sato@2026-08-16" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import type { AttributionData } from '../../../../lib/attribution';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user session
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }
    const userId = userRes.user.id;

    const body = await req.json();
    const attribution: AttributionData = body.attribution;

    if (!attribution || !attribution.firstTouch) {
      return NextResponse.json({ ok: false, error: 'Missing attribution data' }, { status: 400 });
    }

    const { firstTouch, lastTouch, anonymousId, touchCount } = attribution;

    // 1. Retroactively link all past anonymous touchpoints to this user_id
    if (anonymousId) {
      await admin
        .from('visitor_touchpoints')
        .update({ user_id: userId })
        .eq('anonymous_id', anonymousId)
        .is('user_id', null);
    }

    // 2. Check if visitor_attributions row exists for this user
    const { data: existing, error: selectErr } = await admin
      .from('visitor_attributions')
      .select('id, first_source, touch_count, session_count')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectErr) {
      console.error('Error fetching visitor_attribution:', selectErr);
      return NextResponse.json({ ok: false, error: selectErr.message }, { status: 500 });
    }

    if (!existing) {
      // First time saving attribution for this user: insert all fields
      const { error: insertErr } = await admin.from('visitor_attributions').insert({
        user_id: userId,
        anonymous_id: anonymousId || null,

        // First touch
        first_source: firstTouch.source || 'Direct',
        first_medium: firstTouch.medium || null,
        first_campaign: firstTouch.campaign || null,
        first_campaign_id: firstTouch.campaign_id || null,
        first_content: firstTouch.content || null,
        first_content_id: firstTouch.content_id || null,
        first_term: firstTouch.term || null,
        first_landing_page: firstTouch.landingPage || '/',
        first_referrer: firstTouch.referrer || null,
        first_product_viewed: firstTouch.productViewed || null,
        first_visit_at: firstTouch.timestamp || new Date().toISOString(),

        // Last touch
        last_source: lastTouch?.source || firstTouch.source || 'Direct',
        last_medium: lastTouch?.medium || firstTouch.medium || null,
        last_campaign: lastTouch?.campaign || firstTouch.campaign || null,
        last_campaign_id: lastTouch?.campaign_id || firstTouch.campaign_id || null,
        last_content: lastTouch?.content || firstTouch.content || null,
        last_content_id: lastTouch?.content_id || firstTouch.content_id || null,
        last_term: lastTouch?.term || firstTouch.term || null,
        last_landing_page: lastTouch?.landingPage || firstTouch.landingPage || '/',
        last_referrer: lastTouch?.referrer || firstTouch.referrer || null,
        last_product_viewed: lastTouch?.productViewed || firstTouch.productViewed || null,
        last_visit_at: lastTouch?.timestamp || new Date().toISOString(),

        touch_count: touchCount || 1,
        confidence_level: firstTouch.confidence || 'medium',
        confidence_reason: firstTouch.confidence_reason || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertErr) {
        console.error('Error inserting visitor_attributions:', insertErr);
        return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
      }
    } else {
      // User already has first-touch attribution: update ONLY last touch
      const { error: updateErr } = await admin
        .from('visitor_attributions')
        .update({
          ...(anonymousId ? { anonymous_id: anonymousId } : {}),
          last_source: lastTouch?.source || 'Direct',
          last_medium: lastTouch?.medium || null,
          last_campaign: lastTouch?.campaign || null,
          last_campaign_id: lastTouch?.campaign_id || null,
          last_content: lastTouch?.content || null,
          last_content_id: lastTouch?.content_id || null,
          last_term: lastTouch?.term || null,
          last_landing_page: lastTouch?.landingPage || '/',
          last_referrer: lastTouch?.referrer || null,
          last_product_viewed: lastTouch?.productViewed || null,
          last_visit_at: lastTouch?.timestamp || new Date().toISOString(),
          touch_count: (existing.touch_count || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateErr) {
        console.error('Error updating visitor_attributions:', updateErr);
        return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Attribution sync error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Attribution sync failed' }, { status: 500 });
  }
}
