import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

    const admin = getSupabaseAdminClient();

    // Get bearer token from client session
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    // 1) Check subscription from subscriptions table (no profiles table)
    let subscribed = false;
    const { data: sub } = await admin
      .from('subscriptions')
      .select('is_active, valid_until')
      .eq('user_id', userId)
      .maybeSingle();
    if (sub?.is_active) {
      const validUntil = sub.valid_until ? new Date(sub.valid_until as any) : null;
      subscribed = !validUntil || validUntil.getTime() > Date.now();
    }

    // 2) Check purchase (any order with this slug)
    let hasPurchased = false;
    if (!subscribed) {
      const { data: orders } = await admin
        .from('orders')
        .select('id')
        .eq('user_id', userId);
      const orderIds = (orders ?? []).map((o: any) => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await admin
          .from('order_items')
          .select('order_id')
          .in('order_id', orderIds)
          .eq('slug', slug)
          .limit(1);
        hasPurchased = (items ?? []).length > 0;
      }
    }

    if (!subscribed && !hasPurchased) {
      return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
    }

    // 3) Look up source path from templates
    const { data: tpl } = await admin
      .from('templates')
      .select('source_path')
      .eq('slug', slug)
      .maybeSingle();
    const objectPath = tpl?.source_path as string | undefined;
    if (!objectPath) {
      return NextResponse.json({ ok: false, error: 'No source file registered for this template' }, { status: 404 });
    }

    // Stream the file directly instead of exposing a shareable signed URL
    const { data: fileData, error: dlErr } = await admin
      .storage
      .from('templatesource')
      .download(objectPath);
    if (dlErr || !fileData) {
      return NextResponse.json({ ok: false, error: dlErr?.message || 'Download failed' }, { status: 500 });
    }
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = path.basename(objectPath);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


