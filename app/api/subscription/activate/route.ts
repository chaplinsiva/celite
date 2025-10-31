import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error } = await admin.auth.getUser(token);
    if (error || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    // optional body: { plan: 'monthly' | 'yearly' }
    let plan: 'monthly' | 'yearly' = 'monthly';
    try {
      const body = await req.json();
      if (body && (body.plan === 'monthly' || body.plan === 'yearly')) plan = body.plan;
    } catch {}

    // compute valid_until for monthly/yearly
    const now = Date.now();
    const expiresAt = plan === 'yearly'
      ? new Date(now + 365 * 24 * 60 * 60 * 1000)
      : new Date(now + 30 * 24 * 60 * 60 * 1000);

    const { error: upErr } = await admin
      .from('subscriptions')
      .upsert({ user_id: userId, is_active: true, plan, valid_until: expiresAt.toISOString() }, { onConflict: 'user_id' });
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, plan, valid_until: expiresAt.toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


