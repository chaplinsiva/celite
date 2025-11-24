import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

    const admin = getSupabaseAdminClient();

    // Get bearer token from client session
    const auth = req.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    const { searchParams } = new URL(req.url);
    const token = bearer || searchParams.get('token') || null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    // 1) Look up template info (price and source_path)
    const { data: tpl } = await admin
      .from('templates')
      .select('slug, price, source_path')
      .eq('slug', slug)
      .maybeSingle();
    if (!tpl) {
      return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
    }
    
    const templatePrice = tpl.price as number | undefined;
    const sourcePath = tpl.source_path as string | undefined;
    if (!sourcePath) {
      return NextResponse.json({ ok: false, error: 'No source file registered for this template' }, { status: 404 });
    }

    // 2) If template is free (price === 0), allow download without subscription/purchase check
    const isFree = templatePrice === 0 || templatePrice === null || templatePrice === undefined;
    
    let subscriptionId: string | null = null;
    if (!isFree) {
      // For paid templates, check subscription or purchase
      // Check subscription from subscriptions table
      let subscribed = false;
      const { data: sub } = await admin
        .from('subscriptions')
        .select('id, is_active, valid_until')
        .eq('user_id', userId)
        .maybeSingle();
      if (sub?.is_active) {
        const validUntil = sub.valid_until ? new Date(sub.valid_until as any) : null;
        subscribed = !validUntil || validUntil.getTime() > Date.now();
        if (subscribed && sub.id) {
          subscriptionId = sub.id;
        }
      }

      // Check purchase (any order with this slug)
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
    }

    if (subscriptionId && tpl?.slug) {
      try {
        await admin.from('downloads').insert({
          user_id: userId,
          template_slug: tpl.slug,
          subscription_id: subscriptionId,
          downloaded_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Failed to log download:', logErr);
      }
    }

    // Check if source_path is a direct URL (Google Drive, Dropbox, etc.)
    const isDirectUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    
    if (isDirectUrl) {
      return NextResponse.redirect(sourcePath, { status: 302 });
    }

    // For file paths in storage, create signed URL and redirect
    const { data: signed, error: signErr } = await admin
      .storage
      .from('templatesource')
      .createSignedUrl(sourcePath, 60 * 60);
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: signErr?.message || 'Download failed' }, { status: 500 });
    }
    return NextResponse.redirect(signed.signedUrl, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


