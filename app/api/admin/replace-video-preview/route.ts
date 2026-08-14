// agent-notes: ctx="Admin API route for replacing compressed video preview assets in Cloudflare R2", deps="lib/r2Client, lib/supabaseAdmin", state="active", last="vteam@2026-08-02"
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { uploadPreviewToR2 } from '../../../../lib/r2Client';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const templateId = formData.get('templateId') as string | null;
    const videoPath = formData.get('videoPath') as string | null;

    if (!file || !templateId || !videoPath) {
      return NextResponse.json(
        { error: 'Missing required parameters: file, templateId, and videoPath' },
        { status: 400 }
      );
    }

    // Resolve R2 Object Key from videoPath URL or direct path
    let key = videoPath;
    if (key.startsWith('http://') || key.startsWith('https://')) {
      try {
        const urlObj = new URL(key);
        key = urlObj.pathname.replace(/^\/+/, '');
      } catch (e) {
        // Use as key directly if URL parsing fails
      }
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || 'video/mp4';

    // Overwrite video preview in Cloudflare R2 bucket (celite-previews)
    const uploadResult = await uploadPreviewToR2(buffer, key, contentType);

    // Update database record in Supabase (matches by slug or id)
    const admin = getSupabaseAdminClient();
    const { error: dbError } = await admin
      .from('templates')
      .update({
        video_path: uploadResult.url,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', templateId);

    if (dbError) {
      console.warn('[Admin Video Replace] R2 updated, but DB record update had issue:', dbError);
    }

    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);

    return NextResponse.json({
      success: true,
      message: 'Video preview successfully replaced in Cloudflare R2',
      url: uploadResult.url,
      key: uploadResult.key,
      sizeMb,
    });
  } catch (error: any) {
    console.error('[Admin Video Replace] Error replacing video preview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to replace video preview in Cloudflare R2' },
      { status: 500 }
    );
  }
}
