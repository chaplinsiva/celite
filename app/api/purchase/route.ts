import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error } = await admin.auth.getUser(token);
    if (error || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    const body = await req.json();
    const slug: string | undefined = body?.slug;
    if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

    // Load template details
    const { data: tpl, error: tErr } = await admin
      .from('templates')
      .select('slug,name,price,img')
      .eq('slug', slug)
      .maybeSingle();
    if (tErr || !tpl) return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });

    // Create order (paid)
    const { data: order, error: oErr } = await admin
      .from('orders')
      .insert({ user_id: userId, total: Number(tpl.price) || 0, status: 'paid', billing_name: null, billing_email: null, billing_company: null })
      .select('id')
      .single();
    if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });

    // Insert order item
    const { error: iErr } = await admin
      .from('order_items')
      .insert({ order_id: order.id, slug: tpl.slug, name: tpl.name, price: Number(tpl.price) || 0, quantity: 1, img: tpl.img });
    if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, order_id: order.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


