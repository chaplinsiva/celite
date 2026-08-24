// agent-notes: { ctx: "Admin API to manually correct subscription attribution with audit reason and preservation of raw data", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-16" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
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
    const {
      subscriptionAttributionId,
      firstSource,
      firstMedium,
      firstCampaign,
      firstContent,
      lastSource,
      lastMedium,
      lastCampaign,
      lastContent,
      reason,
    } = body;

    if (!subscriptionAttributionId || !reason) {
      return NextResponse.json({ ok: false, error: 'Attribution ID and reason are required' }, { status: 400 });
    }

    // Fetch existing record
    const { data: current, error: fetchErr } = await admin
      .from('subscription_attributions')
      .select('*')
      .eq('id', subscriptionAttributionId)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ ok: false, error: 'Subscription attribution record not found' }, { status: 404 });
    }

    const originalAttribution = current.original_attribution || {
      first_source: current.first_source,
      first_medium: current.first_medium,
      first_campaign: current.first_campaign,
      first_content: current.first_content,
      last_source: current.last_source,
      last_medium: current.last_medium,
      last_campaign: current.last_campaign,
      last_content: current.last_content,
    };

    const { error: updateErr } = await admin
      .from('subscription_attributions')
      .update({
        first_source: firstSource || current.first_source,
        first_medium: firstMedium !== undefined ? firstMedium : current.first_medium,
        first_campaign: firstCampaign !== undefined ? firstCampaign : current.first_campaign,
        first_content: firstContent !== undefined ? firstContent : current.first_content,
        last_source: lastSource || current.last_source,
        last_medium: lastMedium !== undefined ? lastMedium : current.last_medium,
        last_campaign: lastCampaign !== undefined ? lastCampaign : current.last_campaign,
        last_content: lastContent !== undefined ? lastContent : current.last_content,
        is_manually_corrected: true,
        corrected_by: me.user.id,
        corrected_at: new Date().toISOString(),
        correction_reason: reason,
        original_attribution: originalAttribution,
      })
      .eq('id', subscriptionAttributionId);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('Manual attribution correction error:', e);
    const msg = e instanceof Error ? e.message : 'Error correcting attribution';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
