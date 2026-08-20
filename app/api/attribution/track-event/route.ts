// agent-notes: { ctx: "Touchpoint event streaming API endpoint for appending customer journey events to visitor_touchpoints and updating visitor_attributions", deps: ["lib/supabaseAdmin.ts", "lib/attribution.ts"], state: active, last: "sato@2026-08-20" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import type { TouchPoint, EventType } from '../../../../lib/attribution';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const body = await req.json();

    const {
      anonymousId,
      sessionId,
      eventType,
      path,
      url,
      touchPoint,
    }: {
      anonymousId?: string;
      sessionId?: string;
      eventType?: EventType;
      path?: string;
      url?: string;
      touchPoint?: TouchPoint;
    } = body;

    if (!anonymousId && !sessionId) {
      return NextResponse.json({ ok: false, error: 'Missing identifier' }, { status: 400 });
    }

    // Optional user token identification
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (token) {
      try {
        const { data: userRes } = await admin.auth.getUser(token);
        if (userRes?.user) {
          userId = userRes.user.id;
        }
      } catch {
        // Continue anonymously
      }
    }

    const currentTouch = touchPoint || {
      source: 'Direct',
      landingPage: path || '/',
      timestamp: new Date().toISOString(),
    };

    // 1. Append to visitor_touchpoints stream
    const { error: touchpointErr } = await admin.from('visitor_touchpoints').insert({
      anonymous_id: anonymousId || null,
      session_id: sessionId || null,
      user_id: userId,
      event_type: eventType || 'landing',
      url: url || null,
      path: path || currentTouch.landingPage || '/',
      source: currentTouch.source || 'Direct',
      medium: currentTouch.medium || null,
      campaign: currentTouch.campaign || null,
      campaign_id: currentTouch.campaign_id || null,
      content: currentTouch.content || null,
      content_id: currentTouch.content_id || null,
      term: currentTouch.term || null,
      term_id: currentTouch.term_id || null,
      referrer_url: currentTouch.referrer || null,
      referrer_domain: currentTouch.referrerDomain || null,
      gclid: currentTouch.gclid || null,
      fbclid: currentTouch.fbclid || null,
      dclid: currentTouch.dclid || null,
      msclkid: currentTouch.msclkid || null,
      ttclid: currentTouch.ttclid || null,
      utm_id: currentTouch.utm_id || null,
      device_type: currentTouch.device || 'Desktop',
      browser: currentTouch.browser || null,
      os: currentTouch.os || null,
      product_slug: currentTouch.productViewed || null,
      product_name: currentTouch.product_name || null,
      product_id: currentTouch.product_id || null,
      confidence_level: currentTouch.confidence || 'medium',
      confidence_reason: currentTouch.confidence_reason || null,
      created_at: currentTouch.timestamp || new Date().toISOString(),
    });

    if (touchpointErr) {
      console.warn('Failed to insert visitor_touchpoint:', touchpointErr.message);
    }

    // 2. Auto-prune logs older than 5 hours (5-hour TTL)
    try {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      await admin.from('visitor_touchpoints').delete().lt('created_at', fiveHoursAgo);
    } catch (pruneErr) {
      console.warn('Failed to prune old visitor_touchpoints:', pruneErr);
    }

    // 3. If user is authenticated, maintain visitor_attributions table
    if (userId) {
      const { data: existing } = await admin
        .from('visitor_attributions')
        .select('id, touch_count, session_count')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await admin.from('visitor_attributions').insert({
          user_id: userId,
          anonymous_id: anonymousId || null,
          first_source: currentTouch.source || 'Direct',
          first_medium: currentTouch.medium || null,
          first_campaign: currentTouch.campaign || null,
          first_campaign_id: currentTouch.campaign_id || null,
          first_content: currentTouch.content || null,
          first_content_id: currentTouch.content_id || null,
          first_term: currentTouch.term || null,
          first_landing_page: currentTouch.landingPage || '/',
          first_referrer: currentTouch.referrer || null,
          first_product_viewed: currentTouch.productViewed || null,
          first_visit_at: currentTouch.timestamp || new Date().toISOString(),
          last_source: currentTouch.source || 'Direct',
          last_medium: currentTouch.medium || null,
          last_campaign: currentTouch.campaign || null,
          last_campaign_id: currentTouch.campaign_id || null,
          last_content: currentTouch.content || null,
          last_content_id: currentTouch.content_id || null,
          last_term: currentTouch.term || null,
          last_landing_page: currentTouch.landingPage || '/',
          last_referrer: currentTouch.referrer || null,
          last_product_viewed: currentTouch.productViewed || null,
          last_visit_at: currentTouch.timestamp || new Date().toISOString(),
          touch_count: 1,
          session_count: 1,
          confidence_level: currentTouch.confidence || 'medium',
          confidence_reason: currentTouch.confidence_reason || null,
        });
      } else {
        await admin
          .from('visitor_attributions')
          .update({
            anonymous_id: anonymousId || null,
            last_source: currentTouch.source || 'Direct',
            last_medium: currentTouch.medium || null,
            last_campaign: currentTouch.campaign || null,
            last_campaign_id: currentTouch.campaign_id || null,
            last_content: currentTouch.content || null,
            last_content_id: currentTouch.content_id || null,
            last_term: currentTouch.term || null,
            last_landing_page: currentTouch.landingPage || '/',
            last_referrer: currentTouch.referrer || null,
            last_product_viewed: currentTouch.productViewed || null,
            last_visit_at: currentTouch.timestamp || new Date().toISOString(),
            touch_count: (existing.touch_count || 1) + 1,
            confidence_level: currentTouch.confidence || 'medium',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.warn('Track event error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error tracking event' }, { status: 500 });
  }
}
