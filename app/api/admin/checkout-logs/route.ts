// agent-notes: { ctx: "Admin checkout logs API endpoint with attribution data join and contact status updates", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-20" }
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
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', me.user.id).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    // Fetch all checkout_details sorted by latest first
    const { data: checkouts, error: checkoutsErr } = await admin
      .from('checkout_details')
      .select('id,user_id,checkout_type,billing_name,billing_email,billing_mobile,subscription_plan,total_amount,status,razorpay_subscription_id,razorpay_payment_id,whatsapp_sent,email_sent,whatsapp_sent_at,email_sent_at,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (checkoutsErr) return NextResponse.json({ ok: false, error: checkoutsErr.message }, { status: 500 });

    const checkoutList = checkouts || [];
    const checkoutIds = checkoutList.map((c: any) => c.id).filter(Boolean);
    const userIds = Array.from(new Set(checkoutList.map((c: any) => c.user_id).filter(Boolean)));

    // Fetch matching subscription_attributions for completed/snapshot rows
    const { data: subAttributions } = checkoutIds.length > 0
      ? await admin
          .from('subscription_attributions')
          .select('*')
          .in('checkout_detail_id', checkoutIds)
      : { data: [] };

    // Fetch visitor_attributions as fallback for initiated/failed checkouts
    const { data: visitorAttributions } = userIds.length > 0
      ? await admin
          .from('visitor_attributions')
          .select('*')
          .in('user_id', userIds)
      : { data: [] };

    const subAttrMap = new Map();
    (subAttributions || []).forEach((sa: any) => {
      if (sa.checkout_detail_id) subAttrMap.set(sa.checkout_detail_id, sa);
    });

    const visitorAttrMap = new Map();
    (visitorAttributions || []).forEach((va: any) => {
      if (va.user_id) visitorAttrMap.set(va.user_id, va);
    });

    // Merge attribution into checkouts
    const enrichedCheckouts = checkoutList.map((c: any) => {
      const snap = subAttrMap.get(c.id);
      const visitor = visitorAttrMap.get(c.user_id);

      return {
        ...c,
        attribution: snap
          ? {
              first_source: snap.first_source,
              first_medium: snap.first_medium,
              first_campaign: snap.first_campaign,
              first_content: snap.first_content,
              first_landing_page: snap.first_landing_page,
              first_referrer: snap.first_referrer,
              first_product_viewed: snap.first_product_viewed,
              first_visit_at: snap.first_visit_at,
              last_source: snap.last_source,
              last_medium: snap.last_medium,
              last_campaign: snap.last_campaign,
              last_content: snap.last_content,
              last_landing_page: snap.last_landing_page,
              last_referrer: snap.last_referrer,
              last_product_viewed: snap.last_product_viewed,
              last_visit_at: snap.last_visit_at,
              is_snapshot: true,
            }
          : visitor
          ? {
              first_source: visitor.first_source,
              first_medium: visitor.first_medium,
              first_campaign: visitor.first_campaign,
              first_content: visitor.first_content,
              first_landing_page: visitor.first_landing_page,
              first_referrer: visitor.first_referrer,
              first_product_viewed: visitor.first_product_viewed,
              first_visit_at: visitor.first_visit_at,
              last_source: visitor.last_source,
              last_medium: visitor.last_medium,
              last_campaign: visitor.last_campaign,
              last_content: visitor.last_content,
              last_landing_page: visitor.last_landing_page,
              last_referrer: visitor.last_referrer,
              last_product_viewed: visitor.last_product_viewed,
              last_visit_at: visitor.last_visit_at,
              is_snapshot: false,
            }
          : null,
      };
    });

    return NextResponse.json({ ok: true, data: enrichedCheckouts });
  } catch (e: any) {
    console.error('Checkout logs error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', me.user.id).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { checkoutId, whatsapp_sent, email_sent } = body;

    if (!checkoutId) {
      return NextResponse.json({ ok: false, error: 'Missing checkoutId' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof whatsapp_sent === 'boolean') {
      updates.whatsapp_sent = whatsapp_sent;
      updates.whatsapp_sent_at = whatsapp_sent ? new Date().toISOString() : null;
    }

    if (typeof email_sent === 'boolean') {
      updates.email_sent = email_sent;
      updates.email_sent_at = email_sent ? new Date().toISOString() : null;
    }

    const { error: updateErr } = await admin
      .from('checkout_details')
      .update(updates)
      .eq('id', checkoutId);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Status updated successfully' });
  } catch (e: any) {
    console.error('Update checkout status error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

