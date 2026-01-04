import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

async function getCreatorContext(req: Request) {
  const admin = getSupabaseAdminClient();

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) {
    return { error: NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 }) };
  }

  const userId = userRes.user.id;

  const { data: shop, error: shopErr } = await admin
    .from('creator_shops')
    .select('id, slug, name')
    .eq('user_id', userId)
    .maybeSingle();

  if (shopErr || !shop) {
    return { error: NextResponse.json({ ok: false, error: 'No creator shop found for this user' }, { status: 404 }) };
  }

  return { admin, userId, shop };
}

async function computeVendorBalance(admin: any, shopId: string) {
  const { data: templateSlugs } = await admin
    .from('templates')
    .select('slug')
    .eq('creator_shop_id', shopId);
  const slugs = (templateSlugs || []).map((t: any) => t.slug);
  if (!slugs.length) {
    return { totalGross: 0, vendorShare: 0, approvedPayouts: 0, pendingPayouts: 0 };
  }

  const [orderItemsRes, payoutsRes] = await Promise.all([
    admin
      .from('order_items')
      .select('slug, price, quantity, orders!inner(status)')
      .eq('orders.status', 'paid')
      .in('slug', slugs),
    admin
      .from('creator_payout_requests')
      .select('amount,status')
      .eq('creator_shop_id', shopId),
  ]);

  const totalGross = (orderItemsRes.data || []).reduce((sum: number, item: any) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }, 0);
  const vendorShare = totalGross * 0.65;

  const approvedPayouts = (payoutsRes.data || [])
    .filter((p: any) => p.status === 'approved' || p.status === 'completed')
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const pendingPayouts = (payoutsRes.data || [])
    .filter((p: any) => p.status === 'pending' || p.status === 'processing')
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  return { totalGross, vendorShare, approvedPayouts, pendingPayouts };
}

export async function GET(req: Request) {
  const ctx = await getCreatorContext(req);
  if ('error' in ctx) return ctx.error;
  const { admin, shop } = ctx;

  const { data, error } = await admin
    .from('creator_payout_requests')
    .select('id, amount, status, created_at, processed_at')
    .eq('creator_shop_id', shop.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const balance = await computeVendorBalance(admin, shop.id);
  const available = Math.max(
    0,
    balance.vendorShare - balance.approvedPayouts - balance.pendingPayouts,
  );

  return NextResponse.json({
    ok: true,
    requests: data || [],
    balance: {
      totalGross: balance.totalGross,
      vendorShare: balance.vendorShare,
      approvedPayouts: balance.approvedPayouts,
      pendingPayouts: balance.pendingPayouts,
      available,
    },
  });
}

export async function POST(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin, userId, shop } = ctx;

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
    }

    if (amount < 1000) {
      return NextResponse.json({ ok: false, error: 'Minimum withdrawal is ₹1000' }, { status: 400 });
    }

    const balance = await computeVendorBalance(admin, shop.id);
    const available = Math.max(
      0,
      balance.vendorShare - balance.approvedPayouts - balance.pendingPayouts,
    );

    if (amount > available) {
      return NextResponse.json({ ok: false, error: 'Insufficient available balance' }, { status: 400 });
    }

    const { error } = await admin.from('creator_payout_requests').insert({
      creator_shop_id: shop.id,
      user_id: userId,
      amount,
      status: 'pending',
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Creator withdrawal POST error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
