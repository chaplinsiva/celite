import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

function extFromName(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Verify admin user from Authorization: Bearer <token>
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const kind = (form.get('kind') as string | null) || null; // 'thumbnail' | 'video' | 'source'
    const slug = (form.get('slug') as string | null) || '';
    const filename = (form.get('filename') as string | null) || '';
    if (!file || !kind) return NextResponse.json({ ok: false, error: 'Missing file or kind' }, { status: 400 });

    const blob = await file.arrayBuffer();
    const ext = filename ? extFromName(filename) : extFromName(file.name) || (kind === 'thumbnail' ? '.jpg' : kind === 'video' ? '.mp4' : '.zip');

    if (kind === 'thumbnail' || kind === 'video') {
      const bucket = 'templates';
      const folder = kind === 'thumbnail' ? 'previews/IMAGEPREVIEW' : 'previews/VIDEOPREVIEW';
      const objectPath = `${folder}/${filename || (slug ? `${slug} ${kind === 'thumbnail' ? 'thumb' : 'video'}${ext}` : file.name)}`;
      const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, blob, {
        contentType: file.type || (kind === 'thumbnail' ? 'image/jpeg' : 'video/mp4'),
        upsert: true,
      });
      if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!base) return NextResponse.json({ ok: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
      const publicUrl = `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
      return NextResponse.json({ ok: true, url: publicUrl, path: objectPath, kind });
    }

    if (kind === 'source') {
      const bucket = 'templatesource';
      const objectPath = `${filename || (slug ? `${slug}${ext || '.zip'}` : file.name)}`;
      const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, blob, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
      if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
      // Private bucket: return only object path
      return NextResponse.json({ ok: true, path: objectPath, kind });
    }

    return NextResponse.json({ ok: false, error: 'Unknown kind' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


