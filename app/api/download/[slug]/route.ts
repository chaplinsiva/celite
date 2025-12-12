import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

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
    if (!sourcePath || typeof sourcePath !== 'string' || sourcePath.trim() === '') {
      console.error(`Template ${slug} has no source_path`);
      return NextResponse.json({ error: 'Source file not available for this template' }, { status: 404 });
    }

    // Check if source_path is a full URL (starts with http:// or https://)
    const isFullUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    
    // Check if source_path is an R2 path (starts with category/ or is a relative path)
    // R2 paths are stored as: category/subcategory/source/{filename}
    // Supabase storage paths are stored as: templatesource/{filename} or just the filename
    const isR2Path = !isFullUrl && sourcePath.includes('/') && !sourcePath.startsWith('templatesource/');
    
    console.log(`Download request for ${slug}: sourcePath=${sourcePath}, isFullUrl=${isFullUrl}, isR2Path=${isR2Path}`);
    
    let downloadUrl: string;
    
    // If it's a full URL, use it directly
    if (isFullUrl) {
      downloadUrl = sourcePath;
    } else if (isR2Path) {
      // For R2 paths, construct the public URL
      // R2 public URL format: R2_PUBLIC_URL/category/subcategory/source/{filename}
      const R2_PUBLIC_URL = process.env.R2_DIRECT_BASE_URL || '';
      
      if (R2_PUBLIC_URL) {
        downloadUrl = `${R2_PUBLIC_URL}/${sourcePath}`;
      } else {
        // If no public URL configured, return error
        return NextResponse.json({ error: 'R2 public URL not configured' }, { status: 500 });
      }
    } else {
      // Legacy Supabase storage path
      // Remove 'templatesource/' prefix if present
      const storagePath = sourcePath.startsWith('templatesource/') 
        ? sourcePath.replace('templatesource/', '')
        : sourcePath;
      
      // Create signed URL from private bucket 'templatesource'
      const { data, error: signErr } = await admin
        .storage
        .from('templatesource')
        .createSignedUrl(storagePath, 60 * 60); // 1 hour
      
      if (signErr) {
        console.error('Supabase storage error:', signErr);
        return NextResponse.json({ error: `Storage error: ${signErr.message}` }, { status: 500 });
      }

      if (!data || !data.signedUrl) {
        console.error('No signed URL returned from Supabase storage');
        return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
      }

      downloadUrl = data.signedUrl;
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

