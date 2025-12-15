import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { uploadToR2, generateSourceKey, generatePreviewKey, generateVideoKey, generateThumbnailKey, generateAudioPreviewKey, generateModel3DKey } from '../../../../lib/r2Client';

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
    const kind = (form.get('kind') as string | null) || null; // 'source' | 'preview' | 'video' | 'thumbnail' | 'audio_preview' | 'model_3d'
    const categoryId = (form.get('category_id') as string | null) || '';
    const subcategoryId = (form.get('subcategory_id') as string | null) || '';
    const subSubcategoryId = (form.get('sub_subcategory_id') as string | null) || '';
    const slug = (form.get('slug') as string | null) || '';

    if (!file || !kind) return NextResponse.json({ ok: false, error: 'Missing file or kind' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ ok: false, error: 'Missing category_id' }, { status: 400 });

    // Fetch category and subcategory slugs
    const { data: category } = await admin
      .from('categories')
      .select('slug')
      .eq('id', categoryId)
      .maybeSingle();

    if (!category) return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 400 });

    let subcategorySlug: string | null = null;
    if (subcategoryId) {
      const { data: subcategory } = await admin
        .from('subcategories')
        .select('slug')
        .eq('id', subcategoryId)
        .maybeSingle();
      if (subcategory) {
        subcategorySlug = subcategory.slug;
      }
    }

    let subSubcategorySlug: string | null = null;
    if (subSubcategoryId) {
      const { data: subSubcategory } = await admin
        .from('sub_subcategories')
        .select('slug')
        .eq('id', subSubcategoryId)
        .maybeSingle();
      if (subSubcategory) {
        subSubcategorySlug = subSubcategory.slug;
      }
    }

    let defaultExt = '.zip';
    if (kind === 'video') defaultExt = '.mp4';
    else if (kind === 'thumbnail') defaultExt = '.jpg';
    else if (kind === 'preview') defaultExt = '.mp4';
    else if (kind === 'audio_preview') defaultExt = '.mp3';
    else if (kind === 'model_3d') defaultExt = '.glb';
    const ext = extFromName(file.name) || defaultExt;
    const filename = slug ? `${slug}${ext}` : file.name;

    let r2Key: string;
    if (kind === 'source') {
      r2Key = generateSourceKey(category.slug, subcategorySlug, filename, subSubcategorySlug);
    } else if (kind === 'preview') {
      r2Key = generatePreviewKey(category.slug, subcategorySlug, filename, subSubcategorySlug);
    } else if (kind === 'video') {
      r2Key = generateVideoKey(category.slug, subcategorySlug, filename, subSubcategorySlug);
    } else if (kind === 'thumbnail') {
      r2Key = generateThumbnailKey(category.slug, subcategorySlug, filename, subSubcategorySlug);
    } else if (kind === 'audio_preview') {
      r2Key = generateAudioPreviewKey(category.slug, subcategorySlug, filename, subSubcategorySlug);
    } else if (kind === 'model_3d') {
      r2Key = generateModel3DKey(category.slug, subcategorySlug, filename, subSubcategorySlug);
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid kind. Use "source", "preview", "video", "thumbnail", "audio_preview", or "model_3d"' }, { status: 400 });
    }

    // Upload to R2
    const result = await uploadToR2(file, r2Key, file.type || 'application/octet-stream');

    return NextResponse.json({
      ok: true,
      url: result.url,
      key: result.key,
      kind
    });
  } catch (e: any) {
    console.error('R2 upload error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

