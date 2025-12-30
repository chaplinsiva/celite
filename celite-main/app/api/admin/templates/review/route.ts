import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Verify admin user from Authorization: Bearer <token>
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const slug = (body?.slug || '').toString().trim();
    const status = (body?.status || '').toString().trim().toLowerCase();
    const reviewNote = (body?.review_note || '').toString().trim() || null;

    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
    }

    if (!['approved', 'pending', 'rejected'].includes(status)) {
      return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
    }

    const { error } = await admin
      .from('templates')
      .update({
        status,
        review_note: reviewNote,
        reviewed_at: new Date().toISOString(),
      })
      .eq('slug', slug);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Admin review error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


