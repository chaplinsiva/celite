import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { uploadPreviewToR2 } from '../../../../../lib/r2Client';

export const config = {
  api: {
    bodyParser: false,
  },
};

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
    .select('id, slug')
    .eq('user_id', userId)
    .maybeSingle();
  if (shopErr || !shop) {
    return { error: NextResponse.json({ ok: false, error: 'No creator shop found for this user' }, { status: 404 }) };
  }
  return { admin, userId, shop };
}

function extFromName(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '.jpg';
}

export async function POST(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin, shop } = ctx;

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 });

    const ext = extFromName(file.name);
    const key = `preview/vendor-profiles/${shop.slug || shop.id}${ext}`;
    const result = await uploadPreviewToR2(file, key, file.type || 'image/jpeg');

    const { error } = await admin
      .from('creator_shops')
      .update({ profile_image_url: result.url })
      .eq('id', shop.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, url: result.url, key: result.key });
  } catch (e: any) {
    console.error('Creator profile upload error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
