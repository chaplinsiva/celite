/* agent-notes: { ctx: "Local video & image compression API for side-by-side admin inspection before R2 sync", deps: ["lib/supabaseAdmin.ts", "lib/mediaProcessor.ts", "lib/mediaUtils.ts"], state: active, last: "sato@2026-07-28" } */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { compressImageBuffer, compressVideoBuffer } from '../../../../../lib/mediaProcessor';
import { formatBytes, calculateSavings } from '../../../../../lib/mediaUtils';
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
    const { slug, mediaType, quality = 80, targetResolution = '720p' } = body;

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

    // Fetch original asset buffer
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
    const originalSize = inputBuffer.length;

    let compressedBuffer: Buffer;
    let contentType: string;
    let format = mediaType === 'video' ? 'mp4' : 'webp';

    if (mediaType === 'video') {
      // Real local video compression via FFmpeg (H.264 MP4 720p/1080p)
      const result = await compressVideoBuffer(inputBuffer, {
        targetResolution: targetResolution as '720p' | '1080p' | '480p',
        crf: 26,
      });
      compressedBuffer = result.buffer;
      contentType = result.contentType;
      format = result.format;
    } else {
      // Real local image compression via sharp (WebP)
      const result = await compressImageBuffer(inputBuffer, {
        quality: Number(quality) || 80,
        maxWidth: 1920,
        format: 'webp',
      });
      compressedBuffer = result.buffer;
      contentType = result.contentType;
      format = result.format;
    }

    // Ensure public/previews directory exists
    const publicPreviewsDir = path.join(process.cwd(), 'public', 'previews');
    if (!fs.existsSync(publicPreviewsDir)) {
      await fs.promises.mkdir(publicPreviewsDir, { recursive: true });
    }

    const localFileName = `compressed-${slug}-${Date.now()}.${format}`;
    const localFilePath = path.join(publicPreviewsDir, localFileName);
    await fs.promises.writeFile(localFilePath, compressedBuffer);

    const localPreviewUrl = `/previews/${localFileName}`;
    const savings = calculateSavings(originalSize, compressedBuffer.length);

    return NextResponse.json({
      ok: true,
      slug,
      mediaType,
      localPreviewUrl,
      localFilePath,
      originalSize,
      compressedSize: compressedBuffer.length,
      originalSizeFormatted: formatBytes(originalSize),
      compressedSizeFormatted: formatBytes(compressedBuffer.length),
      savingsPercent: savings.savingsPercent,
      savingsBytesFormatted: formatBytes(savings.savingsBytes),
      message: `Local real ${mediaType} compression completed! Inspect video below before uploading to Cloudflare R2.`
    });
  } catch (error: any) {
    console.error('Local media compression API error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during local media compression' }, { status: 500 });
  }
}
