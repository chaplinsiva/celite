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

    // List users using admin service-role with pagination to get all users
    let allUsers: any[] = [];
    let page = 1;
    const perPage = 1000; // Max per page
    
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      
      if (!data?.users || data.users.length === 0) break;
      
      allUsers = allUsers.concat(data.users);
      
      // If we got fewer users than perPage, we've reached the end
      if (data.users.length < perPage) break;
      
      page++;
    }
    
    const users = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      first_name: (u.user_metadata as any)?.first_name ?? null,
      last_name: (u.user_metadata as any)?.last_name ?? null,
      created_at: u.created_at,
    }));
    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


