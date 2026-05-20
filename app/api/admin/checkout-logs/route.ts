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
    const { data, error } = await admin
      .from('checkout_details')
      .select('id,user_id,checkout_type,billing_name,billing_email,billing_mobile,subscription_plan,total_amount,status,razorpay_subscription_id,razorpay_payment_id,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (e: any) {
    console.error('Checkout logs error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
