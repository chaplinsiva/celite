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
    const ext = filename ? extFromName(filename) : extFromName(file.name) || '.zip';

    // Only support source file uploads - preview images/videos are stored in R2
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

    // Thumbnail and video uploads should use R2 upload endpoint
    if (kind === 'thumbnail' || kind === 'video') {
      return NextResponse.json({ ok: false, error: 'Please use the R2 upload endpoint for preview files.' }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: 'Unknown kind' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


