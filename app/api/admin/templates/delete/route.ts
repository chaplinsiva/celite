import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

    // Load source file location before deleting DB row
    const { data: row, error: readErr } = await admin
      .from('templates')
      .select('source_path')
      .eq('slug', slug)
      .maybeSingle();
    if (readErr) return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });

    // Delete source files from storage - preview files are stored in R2 and managed separately
    const srcBucket = 'templatesource';
    const srcPath = (row?.source_path as string) || null;

    // Remove source file from storage (ignore not-found errors)
    if (srcPath) {
      await admin.storage.from(srcBucket).remove([srcPath]).catch(() => {
        // Ignore errors if file doesn't exist
      });
    }

    // Delete DB row
    const { error } = await admin.from('templates').delete().eq('slug', slug);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


