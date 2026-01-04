import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

async function getUser(req: Request) {
  const admin = getSupabaseAdminClient();
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!token) return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) return { error: NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 }) };
  return { admin, userId: userRes.user.id };
}

export async function GET(req: Request) {
  const ctx = await getUser(req);
  if ('error' in ctx) return ctx.error;
  const { admin, userId } = ctx;
  const { data, error } = await admin
    .from('cart_items')
    .select('slug,name,price,qty,img,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data || [] });
}

export async function POST(req: Request) {
  try {
    const ctx = await getUser(req);
    if ('error' in ctx) return ctx.error;
    const { admin, userId } = ctx;
    const body = await req.json().catch(() => ({}));
    const slug = (body?.slug || '').toString().trim();
    const name = (body?.name || '').toString().trim();
    const price = Number(body?.price ?? 0);
    const qty = Math.max(1, Number(body?.qty ?? 1));
    const img = body?.img ? String(body.img) : null;
    if (!slug || !name) {
      return NextResponse.json({ ok: false, error: 'Missing slug or name' }, { status: 400 });
    }
    const { error } = await admin
      .from('cart_items')
      .upsert({
        user_id: userId,
        slug,
        name,
        price: Number.isFinite(price) ? price : 0,
        qty,
        img,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slug' });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Cart POST error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getUser(req);
    if ('error' in ctx) return ctx.error;
    const { admin, userId } = ctx;
    const body = await req.json().catch(() => ({}));
    const slug = (body?.slug || '').toString().trim();
    const qty = Math.max(1, Number(body?.qty ?? 1));
    if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
    const { error } = await admin
      .from('cart_items')
      .update({ qty, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('slug', slug);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Cart PATCH error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getUser(req);
    if ('error' in ctx) return ctx.error;
    const { admin, userId } = ctx;
    const body = await req.json().catch(() => ({}));
    const slug = (body?.slug || '').toString().trim();
    if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
    const { error } = await admin.from('cart_items').delete().eq('user_id', userId).eq('slug', slug);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Cart DELETE error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
