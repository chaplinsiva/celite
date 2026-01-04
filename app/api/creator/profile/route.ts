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
    .select('id, slug, name, description, profile_image_url')
    .eq('user_id', userId)
    .maybeSingle();
  if (shopErr || !shop) {
    return { error: NextResponse.json({ ok: false, error: 'No creator shop found for this user' }, { status: 404 }) };
  }
  return { admin, userId, shop };
}

export async function GET(req: Request) {
  const ctx = await getCreatorContext(req);
  if ('error' in ctx) return ctx.error;
  const { shop } = ctx;
  return NextResponse.json({ ok: true, shop });
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin, shop } = ctx;

    const body = await req.json().catch(() => ({}));
    const profileImageUrl = body?.profile_image_url || body?.profileImageUrl;
    const description = body?.description;
    const name = body?.name;

    const updates: Record<string, any> = {};
    if (profileImageUrl !== undefined) updates.profile_image_url = profileImageUrl ? String(profileImageUrl) : null;
    if (description !== undefined) updates.description = description ? String(description) : null;
    if (name !== undefined) updates.name = name ? String(name) : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await admin.from('creator_shops').update(updates).eq('id', shop.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Creator profile PATCH error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Alias to PATCH for convenience
  return PATCH(req);
}
