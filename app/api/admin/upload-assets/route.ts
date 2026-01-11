import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import path from 'path';
import fs from 'fs';

const BUCKET = 'templates';

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.zip') return 'application/zip';
  return 'application/octet-stream';
}

async function uploadFile(localAbsPath: string, destPath: string) {
  const supabase = getSupabaseAdminClient();
  const data = await fs.promises.readFile(localAbsPath);
  const contentType = guessContentType(localAbsPath);
  const { error } = await supabase.storage.from(BUCKET).upload(destPath, data, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${destPath}: ${error.message}`);
}

function toPublicUrl(objectPath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  return `${baseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

export async function POST() {
  try {
    // Ensure bucket exists and is public (do this once in the Dashboard)
    // Storage bucket name: "templates", public access enabled

    const publicDir = path.join(process.cwd(), 'public', 'TEMPLATES');
    const exists = fs.existsSync(publicDir);
    if (!exists) {
      return NextResponse.json({ ok: false, error: `Missing directory: ${publicDir}` }, { status: 400 });
    }

    // Upload files keeping the same relative structure (e.g., IMAGEPREVIEW/..., VIDEOPREVIEW/...)
    const subfolders = await fs.promises.readdir(publicDir, { withFileTypes: true });
    const uploaded: string[] = [];

    for (const entry of subfolders) {
      if (!entry.isDirectory()) continue;
      const folder = entry.name; // e.g., IMAGEPREVIEW, VIDEOPREVIEW, SOURCES
      const folderAbs = path.join(publicDir, folder);
      const files = await fs.promises.readdir(folderAbs, { withFileTypes: true });
      for (const f of files) {
        if (!f.isFile()) continue;
        const fileAbs = path.join(folderAbs, f.name);
        // Place previews under previews/IMAGEPREVIEW and previews/VIDEOPREVIEW
        const prefix = (folder === 'IMAGEPREVIEW' || folder === 'VIDEOPREVIEW') ? `previews/${folder}` : folder;
        const destPath = `${prefix}/${f.name}`;
        await uploadFile(fileAbs, destPath);
        uploaded.push(destPath);
      }
    }

    // Update DB image/video URLs to Storage public URLs for all templates in DB
    const supabase = getSupabaseAdminClient();
    const { data: rows } = await supabase.from('templates').select('slug,img,video');
    const updates = (rows ?? []).map((t: any) => {
      let imgRel: string | null = typeof t.img === 'string' ? t.img : null;
      let vidRel: string | null = typeof t.video === 'string' ? t.video : null;
      if (imgRel && imgRel.startsWith('/TEMPLATES/')) imgRel = imgRel.replace('/TEMPLATES/', '');
      if (vidRel && vidRel.startsWith('/TEMPLATES/')) vidRel = vidRel.replace('/TEMPLATES/', '');
      if (imgRel && imgRel.startsWith('IMAGEPREVIEW/')) imgRel = `previews/${imgRel}`;
      if (vidRel && vidRel.startsWith('VIDEOPREVIEW/')) vidRel = `previews/${vidRel}`;
      const newImg = imgRel ? toPublicUrl(imgRel) : t.img;
      const newVid = vidRel ? toPublicUrl(vidRel) : t.video;
      return { slug: t.slug, img: newImg, video: newVid };
    });

    const { error: upErr } = await supabase.from('templates').upsert(updates, { onConflict: 'slug' });
    if (upErr) throw new Error(`DB update failed: ${upErr.message}`);

    return NextResponse.json({ ok: true, uploadedCount: uploaded.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


