import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

const CATEGORY_IDS = {
  sfx: 'cf1cf1f2-2823-4bc2-9af1-1f45ffc5a09f',
  music: '143d45f1-a55b-42be-9f51-aab507a20fac',
};

// Video Templates > After Effects
const VIDEO_TEMPLATES_CATEGORY_ID = '448b09c7-addb-4875-83d9-a207e213f6d0';
const AFTER_EFFECTS_SUBCATEGORY_ID = '3fcb4e8b-2886-4dab-97eb-6bf009a9edad';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    const body = await req.json().catch(() => ({}));
    const { group, makeFree } = body as { group: 'sfx' | 'music' | 'low_selling'; makeFree: boolean };

    if (!group || typeof makeFree !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'Provide { group, makeFree }' }, { status: 400 });
    }

    let count = 0;

    if (group === 'sfx' || group === 'music') {
      const categoryId = CATEGORY_IDS[group];
      const { data, error } = await supabase
        .from('templates')
        .update({ is_free: makeFree })
        .eq('category_id', categoryId)
        .select('slug');

      if (error) throw error;
      count = data?.length || 0;
    } else if (group === 'low_selling') {
      // Find templates with zero downloads — only within Video Templates > After Effects
      const { data: downloadedSlugs, error: dlErr } = await supabase
        .from('downloads')
        .select('template_slug');

      if (dlErr) throw dlErr;

      const slugsWithDownloads = new Set((downloadedSlugs || []).map(d => d.template_slug));

      // Get only After Effects template slugs
      const { data: aeTemplates, error: tplErr } = await supabase
        .from('templates')
        .select('slug')
        .eq('category_id', VIDEO_TEMPLATES_CATEGORY_ID)
        .eq('subcategory_id', AFTER_EFFECTS_SUBCATEGORY_ID);

      if (tplErr) throw tplErr;

      const zeroDownloadSlugs = (aeTemplates || [])
        .map(t => t.slug)
        .filter(slug => !slugsWithDownloads.has(slug));

      if (zeroDownloadSlugs.length > 0) {
        // Update in batches of 200 to avoid query size limits
        for (let i = 0; i < zeroDownloadSlugs.length; i += 200) {
          const batch = zeroDownloadSlugs.slice(i, i + 200);
          const { error: updateErr } = await supabase
            .from('templates')
            .update({ is_free: makeFree })
            .in('slug', batch);

          if (updateErr) throw updateErr;
        }
        count = zeroDownloadSlugs.length;
      }
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid group. Use sfx, music, or low_selling' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, count, is_free: makeFree });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

// GET: Return current state for each group
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // SFX: count free vs total
    const { data: sfxAll } = await supabase
      .from('templates')
      .select('is_free')
      .eq('category_id', CATEGORY_IDS.sfx);
    const sfxTotal = sfxAll?.length || 0;
    const sfxFree = sfxAll?.filter(t => t.is_free).length || 0;

    // Music: count free vs total
    const { data: musicAll } = await supabase
      .from('templates')
      .select('is_free')
      .eq('category_id', CATEGORY_IDS.music);
    const musicTotal = musicAll?.length || 0;
    const musicFree = musicAll?.filter(t => t.is_free).length || 0;

    // Low selling: zero downloads — only within Video Templates > After Effects
    const { data: downloadedSlugs } = await supabase
      .from('downloads')
      .select('template_slug');
    const slugsWithDownloads = new Set((downloadedSlugs || []).map(d => d.template_slug));

    const { data: aeTemplates } = await supabase
      .from('templates')
      .select('slug, is_free')
      .eq('category_id', VIDEO_TEMPLATES_CATEGORY_ID)
      .eq('subcategory_id', AFTER_EFFECTS_SUBCATEGORY_ID);
    const zeroDownloadTemplates = (aeTemplates || []).filter(t => !slugsWithDownloads.has(t.slug));
    const lowTotal = zeroDownloadTemplates.length;
    const lowFree = zeroDownloadTemplates.filter(t => t.is_free).length;

    return NextResponse.json({
      ok: true,
      sfx: { total: sfxTotal, free: sfxFree, isFree: sfxTotal > 0 && sfxFree === sfxTotal },
      music: { total: musicTotal, free: musicFree, isFree: musicTotal > 0 && musicFree === musicTotal },
      low_selling: { total: lowTotal, free: lowFree, isFree: lowTotal > 0 && lowFree === lowTotal },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
