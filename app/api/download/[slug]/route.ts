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

    // 1) Look up template info (price and source_path)
    const { data: tpl } = await admin
      .from('templates')
      .select('price, source_path')
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
    
    let activeSubscriptionId: string | null = null;

    if (!isFree) {
      // For paid templates, check subscription or purchase
      // Check subscription from subscriptions table
      let subscribed = false;
      const { data: sub } = await admin
        .from('subscriptions')
        .select('id,is_active, valid_until')
        .eq('user_id', userId)
        .maybeSingle();
      if (sub?.is_active) {
        const validUntil = sub.valid_until ? new Date(sub.valid_until as any) : null;
        const isValid = !validUntil || validUntil.getTime() > Date.now();
        subscribed = isValid;
        if (isValid && sub.id) {
          activeSubscriptionId = sub.id as string;
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

    // 3) Record download for analytics (only once per user/template, and only for subscribed users)
    if (!isFree && activeSubscriptionId) {
      try {
        const { data: existing } = await admin
          .from('downloads')
          .select('id')
          .eq('user_id', userId)
          .eq('template_slug', slug)
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await admin.from('downloads').insert({
            user_id: userId,
            template_slug: slug,
            subscription_id: activeSubscriptionId,
          });
        }
      } catch (e) {
        console.error('Failed to record download:', e);
        // Do not block the actual download on analytics failure
      }
    }

    // Check if source_path is a direct URL (Google Drive, Dropbox, etc.)
    const isDirectUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    
    if (isDirectUrl) {
      // For direct URLs, return JSON with redirect URL for client to handle
      return NextResponse.json({ ok: true, redirect: true, url: sourcePath });
    }

    // For file paths in storage, download from Supabase storage
    const { data: fileData, error: dlErr } = await admin
      .storage
      .from('templatesource')
      .download(sourcePath);
    if (dlErr || !fileData) {
      return NextResponse.json({ ok: false, error: dlErr?.message || 'Download failed' }, { status: 500 });
    }
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = path.basename(sourcePath);
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


