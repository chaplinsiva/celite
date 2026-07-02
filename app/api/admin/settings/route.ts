import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

async function assertAdmin(token: string) {
  const admin = getSupabaseAdminClient();
  const { data: userRes, error } = await admin.auth.getUser(token);
  if (error || !userRes.user) return null;
  const { data } = await admin.from('admins').select('user_id').eq('user_id', userRes.user.id).maybeSingle();
  return data ? userRes.user : null;
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const me = await assertAdmin(token);
    if (!me) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from('settings').select('key,value');
    if (error && error.code !== '42P01') { // table might not exist yet
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    const map: Record<string, string> = {};
    (data ?? []).forEach((row: any) => { map[row.key] = row.value; });
    return NextResponse.json({ ok: true, settings: map });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const me = await assertAdmin(token);
    if (!me) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const settings = body?.settings as Record<string, string> | undefined;
    if (!settings) return NextResponse.json({ ok: false, error: 'Missing settings' }, { status: 400 });
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


