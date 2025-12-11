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

    // 1) Look up template source path (Drive link or storage path)
    const { data: tpl, error: tplErr } = await admin
      .from('templates')
      .select('source_path')
      .eq('slug', slug)
      .maybeSingle();
    if (tplErr || !tpl) {
      return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
    }
    
    const sourcePath = tpl.source_path as string | undefined;
    if (!sourcePath) {
      return NextResponse.json({ ok: false, error: 'No source file registered for this template' }, { status: 404 });
    }

    let activeSubscriptionId: string | null = null;

    // 2) Require an active subscription for access (subscription-only model)
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id,is_active,valid_until')
      .eq('user_id', userId)
      .maybeSingle();
    if (sub?.is_active) {
      const validUntil = sub.valid_until ? new Date(sub.valid_until as any) : null;
      const isValid = !validUntil || validUntil.getTime() > Date.now();
      if (isValid && sub.id) {
        activeSubscriptionId = sub.id as string;
      }
    }

    if (!activeSubscriptionId) {
      return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
    }

    // 3) Record download for analytics (only once per user/template, and only for subscribed users)
    if (activeSubscriptionId) {
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

    // Direct URL (Google Drive, Dropbox, etc.)
    const isDirectUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    if (isDirectUrl) {
      return NextResponse.json({ ok: true, redirect: true, url: sourcePath });
    }

    // Cloudflare R2 path (prefixed with r2:)
    const R2_PREFIX = 'r2:';
    if (sourcePath.startsWith(R2_PREFIX)) {
      const key = sourcePath.slice(R2_PREFIX.length);
      const base = process.env.R2_DIRECT_BASE_URL;
      if (!base) {
        return NextResponse.json({ ok: false, error: 'R2_DIRECT_BASE_URL not configured' }, { status: 500 });
      }

      const trimmedBase = base.replace(/\/+$/, '');
      const trimmedKey = key.replace(/^\/+/, '');
      const publicUrl = `${trimmedBase}/${trimmedKey}`;

      // Behave like Drive/Dropbox: return a redirect URL for the client to open
      return NextResponse.json({ ok: true, redirect: true, url: publicUrl });
    }

    // Supabase Storage (legacy) path
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


