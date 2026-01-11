import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Use Authorization: Bearer <access_token> from the signed-in user
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    const { filePath } = await req.json();
    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    // Check subscription (subscriptions table keyed by user_id)
    const { data: sub } = await admin
      .from('subscriptions')
      .select('is_active, valid_until')
      .eq('user_id', userId)
      .maybeSingle();
    const active = !!sub?.is_active && (!sub?.valid_until || new Date(sub.valid_until as any).getTime() > Date.now());
    if (!active) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    // Create signed URL from private bucket 'templatesource'
    const { data, error: signErr } = await admin
      .storage
      .from('templatesource')
      .createSignedUrl(filePath, 60 * 60); // 1 hour
    if (signErr) return NextResponse.json({ error: signErr.message }, { status: 400 });

    return NextResponse.json({ url: data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


