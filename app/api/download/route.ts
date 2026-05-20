import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    const auth = req.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;

    const body = await req.json();
    const fileName: string | undefined = body?.fileName;

    if (!fileName) {
      return NextResponse.json({ error: 'Missing fileName' }, { status: 400 });
    }

    // Always require auth token — never accept userId from request body
    if (!bearer) {
      return NextResponse.json({ error: 'Missing Authorization token' }, { status: 401 });
    }

    const { data: userRes, error } = await admin.auth.getUser(bearer);
    if (error || !userRes.user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    // Check active subscription in subscriptions table
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
      .createSignedUrl(fileName, 60 * 60);
    if (signErr) return NextResponse.json({ error: signErr.message }, { status: 400 });

    return NextResponse.json({ url: data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


