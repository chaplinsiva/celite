import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = admin
      .from('users_view')
      .select('id,email,raw_user_meta_data,created_at', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,raw_user_meta_data->>first_name.ilike.%${search}%,raw_user_meta_data->>last_name.ilike.%${search}%`);
    }

    const { data: allUsersData, count, error: queryErr } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (queryErr) return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });

    const users = (allUsersData || []).map((u) => ({
      id: u.id,
      email: u.email,
      first_name: (u.raw_user_meta_data as any)?.first_name ?? null,
      last_name: (u.raw_user_meta_data as any)?.last_name ?? null,
      created_at: u.created_at,
    }));

    return NextResponse.json({ ok: true, users, total: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


