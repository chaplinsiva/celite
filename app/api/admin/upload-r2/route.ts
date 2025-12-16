import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { uploadSourceToR2, uploadPreviewToR2, generateSourceKey, generateVideoKey, generateThumbnailKey, generateAudioPreviewKey, generateModel3DKey, generateTemplateFolder } from '../../../../lib/r2Client';

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
    const kind = (form.get('kind') as string | null) || null; // 'source' | 'video' | 'thumbnail' | 'audio_preview' | 'model_3d'
    const categoryId = (form.get('category_id') as string | null) || '';
    const subcategoryId = (form.get('subcategory_id') as string | null) || '';
    const subSubcategoryId = (form.get('sub_subcategory_id') as string | null) || '';
    const slug = (form.get('slug') as string | null) || '';
    const templateName = (form.get('template_name') as string | null) || '';

    if (!file || !kind) return NextResponse.json({ ok: false, error: 'Missing file or kind' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ ok: false, error: 'Missing category_id' }, { status: 400 });
    if (!templateName) return NextResponse.json({ ok: false, error: 'Missing template_name' }, { status: 400 });

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
    else if (kind === 'audio_preview') defaultExt = '.mp3';
    else if (kind === 'model_3d') defaultExt = '.glb';
    const ext = extFromName(file.name) || defaultExt;
    const filename = slug ? `${slug}${ext}` : file.name;
    
    // Generate template folder name from template name
    const templateFolder = generateTemplateFolder(templateName);

    let r2Key: string;
    let result;
    
    if (kind === 'source') {
      // Source files go to private bucket
      r2Key = generateSourceKey(category.slug, subcategorySlug, subSubcategorySlug, templateFolder, filename);
      result = await uploadSourceToR2(file, r2Key, file.type || 'application/octet-stream');
    } else if (kind === 'video') {
      // Preview files go to public bucket
      r2Key = generateVideoKey(category.slug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
      result = await uploadPreviewToR2(file, r2Key, file.type || 'application/octet-stream');
    } else if (kind === 'thumbnail') {
      r2Key = generateThumbnailKey(category.slug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
      result = await uploadPreviewToR2(file, r2Key, file.type || 'application/octet-stream');
    } else if (kind === 'audio_preview') {
      r2Key = generateAudioPreviewKey(category.slug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
      result = await uploadPreviewToR2(file, r2Key, file.type || 'application/octet-stream');
    } else if (kind === 'model_3d') {
      r2Key = generateModel3DKey(category.slug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
      result = await uploadPreviewToR2(file, r2Key, file.type || 'application/octet-stream');
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid kind. Use "source", "video", "thumbnail", "audio_preview", or "model_3d"' }, { status: 400 });
    }

    // For source files, return key only (no public URL)
    // For preview files, return public URL
    return NextResponse.json({
      ok: true,
      url: kind === 'source' ? result.key : result.url, // Source files: return key, Preview files: return public URL
      key: result.key,
      kind
    });
  } catch (e: any) {
    console.error('R2 upload error:', e);
    // Provide more helpful error messages
    let errorMessage = e?.message || 'Unknown error';
    if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
      errorMessage = `R2 bucket error: ${errorMessage}. Please verify R2_SOURCE_BUCKET and R2_PREVIEWS_BUCKET are set correctly and the buckets exist in Cloudflare R2.`;
    } else if (errorMessage.includes('credentials') || errorMessage.includes('Access')) {
      errorMessage = `R2 credentials error: ${errorMessage}. Please check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in your environment variables.`;
    }
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

