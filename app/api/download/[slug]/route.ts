import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { getSignedSourceUrl } from '../../../../lib/r2Client';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const admin = getSupabaseAdminClient();

    // Check authentication
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const userId = userRes.user.id;

    // Check subscription
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, is_active, valid_until')
      .eq('user_id', userId)
      .maybeSingle();
    const active = !!sub?.is_active && (!sub?.valid_until || new Date(sub.valid_until as any).getTime() > Date.now());
    if (!active) {
      return NextResponse.json({ error: 'Access denied. Please subscribe to download.' }, { status: 403 });
    }

    // Get template from database
    const { data: template, error: templateErr } = await admin
      .from('templates')
      .select('slug, name, source_path')
      .eq('slug', slug)
      .maybeSingle();

    if (templateErr || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const sourcePath = template.source_path;
    if (!sourcePath || typeof sourcePath !== 'string' || sourcePath.trim() === '') {
      console.error(`Template ${slug} has no source_path`);
      return NextResponse.json({ error: 'Source file not available for this template' }, { status: 404 });
    }

    // Check if source_path is a full URL (legacy support)
    const isFullUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    
    let downloadUrl: string;
    
    if (isFullUrl) {
      // Legacy: If it's a full URL, it might be from old system
      // For security, we should migrate these to R2, but for now support them
      downloadUrl = sourcePath;
    } else {
      // New R2 system: source_path is the R2 key in celite-source-files bucket
      // Generate a signed URL with short expiry (15 minutes) for security
      // This ensures the link is not shareable and expires quickly
      try {
        downloadUrl = await getSignedSourceUrl(sourcePath, 15 * 60); // 15 minutes expiry
      } catch (r2Error: any) {
        console.error('R2 signed URL generation error:', r2Error);
        return NextResponse.json({ error: 'Failed to generate secure download link' }, { status: 500 });
      }
    }

    // Record download - do this before returning the URL
    try {
      // Get subscription_id if available
      const subscriptionId = sub?.id || null;
      
      const { error: downloadErr } = await admin.from('downloads').insert({
        user_id: userId,
        template_slug: slug,
        downloaded_at: new Date().toISOString(),
        ...(subscriptionId && { subscription_id: subscriptionId }),
      });
      
      if (downloadErr) {
        console.error('Failed to record download:', downloadErr);
        // Don't fail the download, but log the error for debugging
      } else {
        console.log(`Download recorded successfully for user ${userId}, template ${slug}`);
      }
    } catch (downloadErr: any) {
      // Log but don't fail the download if recording fails
      console.error('Failed to record download (exception):', downloadErr);
    }

    // Return redirect URL
    return NextResponse.json({ redirect: true, url: downloadUrl });
  } catch (e: any) {
    console.error('Download error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

