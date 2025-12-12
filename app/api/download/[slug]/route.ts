import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { getFileFromR2 } from '../../../../lib/r2Client';

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
      .select('is_active, valid_until')
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
    if (!sourcePath) {
      return NextResponse.json({ error: 'Source file not available' }, { status: 404 });
    }

    // Check if source_path is an R2 path (starts with category/ or is a relative path)
    // R2 paths are stored as: category/subcategory/source/{filename}
    // Supabase storage paths are stored as: templatesource/{filename}
    const isR2Path = sourcePath.includes('/') && !sourcePath.startsWith('templatesource/');
    
    if (isR2Path) {
      // Download from R2
      try {
        const { body, contentType } = await getFileFromR2(sourcePath);
        
        // Record download
        await admin.from('downloads').insert({
          user_id: userId,
          template_slug: slug,
          downloaded_at: new Date().toISOString(),
        });

        // Return file
        return new NextResponse(body as any, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${template.name.replace(/[^a-z0-9]/gi, '_')}.zip"`,
          },
        });
      } catch (r2Err: any) {
        console.error('R2 download error:', r2Err);
        return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 });
      }
    } else {
      // Legacy Supabase storage path
      // Create signed URL from private bucket 'templatesource'
      const { data, error: signErr } = await admin
        .storage
        .from('templatesource')
        .createSignedUrl(sourcePath.replace('templatesource/', ''), 60 * 60); // 1 hour
      
      if (signErr) {
        return NextResponse.json({ error: signErr.message }, { status: 400 });
      }

      // Record download
      await admin.from('downloads').insert({
        user_id: userId,
        template_slug: slug,
        downloaded_at: new Date().toISOString(),
      });

      // Return redirect URL
      return NextResponse.json({ redirect: true, url: data.signedUrl });
    }
  } catch (e: any) {
    console.error('Download error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

