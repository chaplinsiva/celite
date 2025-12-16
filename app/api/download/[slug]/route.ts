import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { getSourceFileFromR2 } from '../../../../lib/r2Client';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Extract file extension from a path or filename
 */
function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '.zip'; // Default to .zip if no extension
  return path.substring(lastDot);
}

/**
 * Get filename from R2 key path (last part after /)
 */
function getFilenameFromKey(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 1] || 'file.zip';
}

export async function GET(
  req: Request,
  context: RouteContext
) {
  let slug: string = 'unknown';
  try {
    const params = await context.params;
    slug = params.slug;
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
      console.error(`[Download] Template ${slug} has no source_path`);
      return NextResponse.json({ error: 'Source file not available for this template' }, { status: 404 });
    }

    console.log(`[Download] Template ${slug} source_path: ${sourcePath.substring(0, 100)}...`);

    // Check if source_path is a full URL (legacy support - redirect to external URL)
    const isFullUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    
    if (isFullUrl) {
      // Legacy: For external URLs, redirect (but record download first)
      try {
        const subscriptionId = sub?.id || null;
        await admin.from('downloads').insert({
          user_id: userId,
          template_slug: slug,
          downloaded_at: new Date().toISOString(),
          ...(subscriptionId && { subscription_id: subscriptionId }),
        });
      } catch (err) {
        console.error('Failed to record download:', err);
      }
      
      // Return redirect for legacy URLs
      return NextResponse.json({ redirect: true, url: sourcePath });
    }

    // New R2 system: Fetch file directly from private bucket
    // This ensures the R2 URL is never exposed to the client
    let fileData: { body: Buffer; contentType: string };
    let filename: string;
    
    try {
      console.log(`[Download] Fetching file from R2 for template ${slug}, key: ${sourcePath}`);
      
      // Fetch file from R2 (source_path is the R2 key)
      fileData = await getSourceFileFromR2(sourcePath);
      
      if (!fileData || !fileData.body) {
        console.error(`[Download] File data is empty for ${slug}`);
        return NextResponse.json({ error: 'File data is empty' }, { status: 500 });
      }
      
      console.log(`[Download] File fetched successfully, size: ${fileData.body.length} bytes`);
      
      // Extract filename from R2 key or use slug with detected extension
      const keyFilename = getFilenameFromKey(sourcePath);
      const ext = getFileExtension(keyFilename);
      filename = `${slug}${ext}`;
    } catch (r2Error: any) {
      console.error(`[Download] R2 file fetch error for ${slug}:`, r2Error);
      console.error(`[Download] Error details:`, {
        message: r2Error?.message,
        name: r2Error?.name,
        code: r2Error?.code,
        stack: r2Error?.stack,
      });
      
      // Handle specific R2 errors
      if (r2Error?.name === 'NoSuchKey' || r2Error?.message?.includes('not found') || r2Error?.message?.includes('NoSuchKey')) {
        return NextResponse.json({ error: 'Source file not found in storage' }, { status: 404 });
      }
      
      if (r2Error?.name === 'NoSuchBucket' || r2Error?.message?.includes('bucket')) {
        return NextResponse.json({ error: 'Storage bucket not configured. Please contact support.' }, { status: 500 });
      }
      
      if (r2Error?.message?.includes('credentials') || r2Error?.message?.includes('Access')) {
        return NextResponse.json({ error: 'Storage authentication failed. Please contact support.' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to retrieve file. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? r2Error?.message : undefined
      }, { status: 500 });
    }

    // Record download BEFORE streaming the file
    try {
      const subscriptionId = sub?.id || null;
      const { error: downloadErr } = await admin.from('downloads').insert({
        user_id: userId,
        template_slug: slug,
        downloaded_at: new Date().toISOString(),
        ...(subscriptionId && { subscription_id: subscriptionId }),
      });
      
      if (downloadErr) {
        console.error('Failed to record download:', downloadErr);
        // Don't fail the download, but log the error
      } else {
        console.log(`Download recorded successfully for user ${userId}, template ${slug}`);
      }
    } catch (downloadErr: any) {
      console.error('Failed to record download (exception):', downloadErr);
      // Continue with download even if recording fails
    }

    // Stream the file directly to the client
    // This hides the R2 URL completely - the client never sees it
    try {
      // Convert Buffer to Uint8Array for NextResponse
      const fileBytes = new Uint8Array(fileData.body);
      
      console.log(`[Download] Streaming file ${filename} (${fileData.body.length} bytes) to client`);
      
      return new NextResponse(fileBytes, {
        status: 200,
        headers: {
          'Content-Type': fileData.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'Content-Length': fileData.body.length.toString(),
          // Security headers
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          // Prevent exposing the R2 URL
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (streamError: any) {
      console.error(`[Download] Error streaming file for ${slug}:`, streamError);
      return NextResponse.json({ 
        error: 'Failed to stream file',
        details: process.env.NODE_ENV === 'development' ? streamError?.message : undefined
      }, { status: 500 });
    }
  } catch (e: any) {
    const errorSlug = slug || 'unknown';
    console.error(`[Download] Unexpected error for ${errorSlug}:`, e);
    console.error(`[Download] Error stack:`, e?.stack);
    return NextResponse.json({ 
      error: e?.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, { status: 500 });
  }
}

