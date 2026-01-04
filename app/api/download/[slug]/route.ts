import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

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

    // Get template from database
    const { data: template, error: templateErr } = await admin
      .from('templates')
      .select('slug, name, source_path, is_free, creator_shop_id')
      .eq('slug', slug)
      .maybeSingle();

    if (templateErr || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // (Subscriptions removed) - only purchases or free templates allow download
    const { data: purchase } = await admin
      .from('order_items')
      .select('id, orders!inner(user_id,status)')
      .eq('slug', slug)
      .eq('orders.user_id', userId)
      .eq('orders.status', 'paid')
      .maybeSingle();
    const hasPurchase = !!purchase;
    const isFreeTemplate = template?.is_free === true;

    if (!isFreeTemplate && !hasPurchase) {
      return NextResponse.json({ error: 'Access denied. Please purchase this template to download.' }, { status: 403 });
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
        const now = new Date().toISOString();

        // Track free templates in free_downloads
        if (isFreeTemplate) {
          await admin.from('free_downloads').insert({
            user_id: userId,
            template_slug: slug,
            downloaded_at: now,
            created_at: now,
          });
        }

        // Track purchase downloads in downloads table (lifetime access)
        // Only insert if user doesn't already have a download record for this template
        if (hasPurchase) {
          const { data: existingDownload } = await admin
            .from('downloads')
            .select('id')
            .eq('user_id', userId)
            .eq('template_slug', slug)
            .limit(1);
          
          if (!existingDownload || existingDownload.length === 0) {
            await admin.from('downloads').insert({
              user_id: userId,
              template_slug: slug,
              creator_shop_id: template?.creator_shop_id || null,
              downloaded_at: now,
            });
          }
        }
      } catch (err) {
        console.error('Failed to record download:', err);
      }

      // Return redirect for legacy URLs
      return NextResponse.json({ redirect: true, url: sourcePath });
    }

    // New R2 system: Generate signed URL for direct download
    // This avoids loading large files into memory
    let signedUrl: string;
    let filename: string;

    try {
      console.log(`[Download] Generating signed URL for template ${slug}, key: ${sourcePath}`);

      // Import the signed URL function
      const { getSignedSourceUrl } = await import('../../../../lib/r2Client');

      // Generate signed URL (expires in 5 minutes)
      signedUrl = await getSignedSourceUrl(sourcePath, 300);

      console.log(`[Download] Signed URL generated successfully for ${slug}`);

      // Extract filename from R2 key or use slug with detected extension
      const keyFilename = getFilenameFromKey(sourcePath);
      const ext = getFileExtension(keyFilename);
      filename = `${slug}${ext}`;
    } catch (r2Error: any) {
      console.error(`[Download] R2 signed URL error for ${slug}:`, r2Error);
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
        error: 'Failed to generate download link. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? r2Error?.message : undefined
      }, { status: 500 });
    }

    // Record download BEFORE returning the signed URL
    try {
      console.log(`[Download] Recording download for template: ${slug}, user: ${userId}, isFree: ${isFreeTemplate}, hasPurchase: ${hasPurchase}`);

      const now = new Date().toISOString();

      // Always track free templates in free_downloads table
      if (isFreeTemplate) {
        const freeDownloadRecord = {
          user_id: userId,
          template_slug: slug,
          downloaded_at: now,
          created_at: now,
        };

        const { error: freeErr } = await admin.from('free_downloads').insert(freeDownloadRecord);

        if (freeErr) {
          console.error('[Download] Failed to record free download:', freeErr);
          console.error('[Download] Free download record was:', freeDownloadRecord);
        } else {
          console.log(`[Download] ✅ Free download recorded successfully for user ${userId}, template ${slug}`);
        }
      }

      // Track purchase downloads in downloads table (lifetime access)
      // Only insert if user doesn't already have a download record for this template
      if (hasPurchase) {
        const { data: existingDownload } = await admin
          .from('downloads')
          .select('id')
          .eq('user_id', userId)
          .eq('template_slug', slug)
          .limit(1);
        
        if (!existingDownload || existingDownload.length === 0) {
          const { error: purchaseErr } = await admin.from('downloads').insert({
            user_id: userId,
            template_slug: slug,
            creator_shop_id: template?.creator_shop_id || null,
            downloaded_at: now,
          });
          if (purchaseErr) {
            console.error('[Download] Failed to record purchase download:', purchaseErr);
          }
        }
      } else if (!isFreeTemplate) {
        // This case shouldn't happen due to access check, but if it does, we skip tracking
        console.warn(`[Download] ⚠️ Paid template download attempted without purchase for user ${userId}, template ${slug} - skipping download tracking`);
      }
    } catch (downloadErr: any) {
      console.error('[Download] Failed to record download (exception):', downloadErr);
      // Continue with download even if recording fails
    }

    // Return signed URL for direct browser download
    // The client will redirect to this URL for actual download
    return NextResponse.json({
      redirect: true,
      url: signedUrl,
      filename: filename
    });
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


