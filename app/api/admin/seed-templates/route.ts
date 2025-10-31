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
      price: t.price,
      img: t.img,
      video: t.video,
      source_path: t.source_path ?? null,
      features: t.features,
      software: t.software,
      plugins: t.plugins,
      tags: t.tags ?? [],
      is_featured: !!(t.is_featured ?? t.isFeatured),
      is_limited_offer: !!(t.is_limited_offer ?? false),
      limited_offer_duration_days: t.limited_offer_duration_days ?? null,
      limited_offer_start_date: t.limited_offer_start_date ?? null,
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


