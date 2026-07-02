import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    const body = await req.json().catch(() => ({}));
    const input = Array.isArray(body?.templates) ? body.templates : null;
    if (!input) {
      return NextResponse.json({ ok: false, error: 'Provide { templates: [...] } in request body' }, { status: 400 });
    }
    const rows = input.map((t: any) => ({
      slug: t.slug,
      name: t.name,
      subtitle: t.subtitle,
      description: t.description ?? t.desc,
      img: t.img,
      video: t.video, // Keep for old templates
      video_path: t.video_path ?? null,
      thumbnail_path: t.thumbnail_path ?? null,
      audio_preview_path: t.audio_preview_path ?? null,
      model_3d_path: t.model_3d_path ?? null,
      source_path: t.source_path ?? null,
      preview_path: t.preview_path ?? null,
      features: t.features,
      software: t.software,
      plugins: t.plugins,
      tags: t.tags ?? [],
      category_id: t.category_id || null,
      subcategory_id: t.subcategory_id || null,
      meta_title: t.meta_title || null,
      meta_description: t.meta_description || null,
    }));
    const { data, error } = await supabase
      .from('templates')
      .upsert(rows, { onConflict: 'slug' })
      .select('slug');
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: data?.length ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


