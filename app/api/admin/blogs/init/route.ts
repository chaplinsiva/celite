import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

// agent-notes: { ctx: "Admin endpoint to initialize/verify blogs database table", deps: [lib/supabaseAdmin], state: active, last: "sato@2026-08-16" }

async function assertAdmin(token: string) {
  const admin = getSupabaseAdminClient();
  const { data: userRes, error } = await admin.auth.getUser(token);
  if (error || !userRes.user) return null;
  const { data } = await admin.from('admins').select('user_id').eq('user_id', userRes.user.id).maybeSingle();
  return data ? userRes.user : null;
}

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const me = await assertAdmin(token);
    if (!me) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    // Test if table exists
    const { error: testError } = await admin.from('blogs').select('id').limit(1);

    if (testError && testError.code === '42P01') {
      // relation "blogs" does not exist
      return NextResponse.json({
        ok: false,
        exists: false,
        error: 'Table blogs does not exist yet. Please run migration 52_create_blogs_table.sql.',
      });
    }

    return NextResponse.json({ ok: true, exists: true, message: 'Blogs table is verified and ready.' });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
