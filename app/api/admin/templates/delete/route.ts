import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

    // Load file locations before deleting DB row
    const { data: row, error: readErr } = await admin
      .from('templates')
      .select('img, video, source_path')
      .eq('slug', slug)
      .maybeSingle();
    if (readErr) return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });

    // Derive storage object paths
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const publicPrefix = `${base}/storage/v1/object/public/`;
    const tmplBucket = 'templates';
    const srcBucket = 'templatesource';

    const toObjectPath = (url?: string | null): string | null => {
      if (!url || typeof url !== 'string') return null;
      // When a full public URL is stored
      const prefix = `${publicPrefix}${tmplBucket}/`;
      if (url.startsWith(prefix)) return url.slice(prefix.length);
      // If already an object path (e.g., previews/IMAGEPREVIEW/...)
      if (url.startsWith('previews/')) return url;
      // Legacy local path -> attempt mapping
      if (url.startsWith('/TEMPLATES/IMAGEPREVIEW/')) return `previews/${url.replace('/TEMPLATES/', '')}`;
      if (url.startsWith('/TEMPLATES/VIDEOPREVIEW/')) return `previews/${url.replace('/TEMPLATES/', '')}`;
      return null;
    };

    const imgPath = toObjectPath(row?.img as any);
    const vidPath = toObjectPath(row?.video as any);
    const srcPath = (row?.source_path as string) || null;

    // Remove files from storage (ignore not-found errors)
    const removals: Array<Promise<any>> = [];
    const tPaths = [imgPath, vidPath].filter(Boolean) as string[];
    if (tPaths.length > 0) removals.push(admin.storage.from(tmplBucket).remove(tPaths));
    if (srcPath) removals.push(admin.storage.from(srcBucket).remove([srcPath]));
    await Promise.allSettled(removals);

    // Delete DB row
    const { error } = await admin.from('templates').delete().eq('slug', slug);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


