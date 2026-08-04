/* agent-notes: { ctx: "Real server-side media compression API using sharp and FFmpeg for Cloudflare R2", deps: ["lib/supabaseAdmin.ts", "lib/r2Client.ts", "lib/mediaProcessor.ts", "lib/mediaUtils.ts"], state: active, last: "sato@2026-07-28" } */

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { uploadPreviewToR2 } from '../../../../../lib/r2Client';
import { compressImageBuffer, compressVideoBuffer } from '../../../../../lib/mediaProcessor';
import { getOriginalBackupKey, formatBytes, calculateSavings } from '../../../../../lib/mediaUtils';
import { convertR2UrlToCdn } from '../../../../../lib/utils';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !user) {
        return NextResponse.json({ error: 'Unauthorized admin user' }, { status: 401 });
      }
      const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (!adminRow) {
        return NextResponse.json({ error: 'Forbidden: User is not an admin' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { slug, mediaType, quality = 80, targetResolution = '720p', clientCompressedBase64 } = body;

    if (!slug || !mediaType) {
      return NextResponse.json({ error: 'Missing required parameters: slug, mediaType' }, { status: 400 });
    }

    // Fetch template details from DB
    const { data: template, error: fetchErr } = await admin
      .from('templates')
      .select('slug, name, category_id, video_path, thumbnail_path, img')
      .eq('slug', slug)
      .single();

    if (fetchErr || !template) {
      return NextResponse.json({ error: `Template not found: ${slug}` }, { status: 404 });
    }

    const currentUrl = mediaType === 'video' ? template.video_path : (template.thumbnail_path || template.img);
    if (!currentUrl) {
      return NextResponse.json({ error: `No current ${mediaType} asset found for template ${slug}` }, { status: 400 });
    }

    let compressedBuffer: Buffer;
    let contentType: string;
    let originalSize = 0;
    let format = mediaType === 'video' ? 'mp4' : 'webp';

    if (clientCompressedBase64 && typeof clientCompressedBase64 === 'string' && clientCompressedBase64.startsWith('data:')) {
      // Use client-generated WebP compressed buffer if provided
      const matches = clientCompressedBase64.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1];
        compressedBuffer = Buffer.from(matches[2], 'base64');
      } else {
        compressedBuffer = Buffer.from(clientCompressedBase64, 'base64');
        contentType = mediaType === 'video' ? 'video/mp4' : 'image/webp';
      }

      // Estimate original size from HTTP fetch if available
      const fullCdnUrl = convertR2UrlToCdn(currentUrl) || currentUrl;
      try {
        const headRes = await fetch(fullCdnUrl, { method: 'HEAD' });
        const len = headRes.headers.get('content-length');
        if (len) originalSize = parseInt(len, 10);
      } catch (e) {}

      if (!originalSize) originalSize = Math.round(compressedBuffer.length * 2.5);
    } else {
      // Fetch original asset buffer from R2 / CDN
      let fetchUrl = convertR2UrlToCdn(currentUrl) || currentUrl;
      if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://')) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        fetchUrl = `${baseUrl}${fetchUrl.startsWith('/') ? '' : '/'}${fetchUrl}`;
      }

      let originalRes: Response;
      try {
        originalRes = await fetch(fetchUrl);
      } catch (fetchErr: any) {
        return NextResponse.json({ error: `Unable to fetch original asset from ${fetchUrl}: ${fetchErr?.message}` }, { status: 502 });
      }

      if (!originalRes.ok) {
        return NextResponse.json({ error: `Failed to download original asset from ${fetchUrl} (Status ${originalRes.status})` }, { status: 502 });
      }

      const arrayBuffer = await originalRes.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      originalSize = inputBuffer.length;

      if (mediaType === 'video') {
        // Real server-side video compression via FFmpeg (transcodes to 720p/1080p H.264 MP4)
        const result = await compressVideoBuffer(inputBuffer, {
          targetResolution: targetResolution as '720p' | '1080p' | '480p',
          crf: 26,
        });
        compressedBuffer = result.buffer;
        contentType = result.contentType;
        format = result.format;
      } else {
        // Real server-side image compression via sharp (converts PNG/JPEG to WebP)
        const result = await compressImageBuffer(inputBuffer, {
          quality: Number(quality) || 80,
          maxWidth: 1920,
          format: 'webp',
        });
        compressedBuffer = result.buffer;
        contentType = result.contentType;
        format = result.format;
      }
    }

    // Key naming for Cloudflare R2 preview bucket
    const r2Key = `previews/${slug}-${mediaType}-compressed-${Date.now()}.${format}`;
    const backupKey = getOriginalBackupKey(currentUrl);

    // Upload real compressed Buffer to Cloudflare R2
    let uploadRes;
    try {
      uploadRes = await uploadPreviewToR2(compressedBuffer, r2Key, contentType);
    } catch (r2Err: any) {
      console.error('R2 upload failed during compression:', r2Err);
      return NextResponse.json({
        error: r2Err?.message || 'Cloudflare R2 upload failed. Please verify R2 credentials in .env.local'
      }, { status: 400 });
    }

    const newCdnUrl = uploadRes.url;

    // Update Supabase DB with new compressed asset URL
    const updatePayload: Record<string, any> = {};
    if (mediaType === 'video') {
      updatePayload.video_path = newCdnUrl;
    } else {
      updatePayload.thumbnail_path = newCdnUrl;
    }

    const { error: updateErr } = await admin
      .from('templates')
      .update(updatePayload)
      .eq('slug', slug);

    if (updateErr) {
      console.error('Failed to update template DB record:', updateErr);
      return NextResponse.json({ error: 'Failed to update database record' }, { status: 500 });
    }

    const savings = calculateSavings(originalSize, compressedBuffer.length);

    return NextResponse.json({
      ok: true,
      slug,
      mediaType,
      newUrl: newCdnUrl,
      originalSize,
      compressedSize: compressedBuffer.length,
      originalSizeFormatted: formatBytes(originalSize),
      compressedSizeFormatted: formatBytes(compressedBuffer.length),
      savingsPercent: savings.savingsPercent,
      savingsBytesFormatted: formatBytes(savings.savingsBytes),
      message: `Real ${mediaType} compression completed and uploaded to Cloudflare R2!`
    });
  } catch (error: any) {
    console.error('Real media compression API error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during media compression' }, { status: 500 });
  }
}
