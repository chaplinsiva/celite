import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { uploadToR2 } from '../../../../lib/r2Client';
import path from 'path';

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
    const categoryId = (form.get('category_id') as string | null) || null;
    const subcategoryId = (form.get('subcategory_id') as string | null) || null;
    if (!file || !kind) return NextResponse.json({ ok: false, error: 'Missing file or kind' }, { status: 400 });

    const blob = await file.arrayBuffer();
    const ext = filename ? extFromName(filename) : extFromName(file.name) || '.zip';

    // Resolve category/subcategory slugs for path structure
    let categorySlug = 'uncategorized';
    let subcategorySlug = 'uncategorized';

    if (categoryId) {
      const { data: cat } = await admin
        .from('categories')
        .select('slug')
        .eq('id', categoryId)
        .maybeSingle();
      if (cat?.slug) categorySlug = String(cat.slug);
    }

    if (subcategoryId) {
      const { data: subcat } = await admin
        .from('subcategories')
        .select('slug')
        .eq('id', subcategoryId)
        .maybeSingle();
      if (subcat?.slug) subcategorySlug = String(subcat.slug);
    }

    const safeCategory = categorySlug || 'uncategorized';
    const safeSubcategory = subcategorySlug || 'general';

    // Source file upload (R2, private)
    if (kind === 'source') {
      const fileExt = ext || extFromName(file.name) || '.zip';
      const baseName = slug || path.basename(file.name, fileExt);
      // R2 key structure: source/category/subcategory/slug.ext
      const objectKey = `source/${safeCategory}/${safeSubcategory}/${baseName}${fileExt}`;

      await uploadToR2(objectKey, blob, file.type || 'application/octet-stream');

      // Store a prefixed path so we can detect R2 in download route
      return NextResponse.json({ ok: true, path: `r2:${objectKey}`, kind });
    }

    // Thumbnail or video preview upload (R2, public-ish path saved as r2: key)
    if (kind === 'thumbnail' || kind === 'video') {
      const defaultExt = kind === 'thumbnail' ? '.jpg' : '.mp4';
      const fileExt = ext || extFromName(file.name) || defaultExt;
      const baseName = slug || path.basename(file.name, fileExt);
      const folder = kind === 'thumbnail' ? 'thumbnails' : 'videos';
      // R2 key structure: preview/category/subcategory/thumbnails|videos/slug.ext
      const objectKey = `preview/${safeCategory}/${safeSubcategory}/${folder}/${baseName}${fileExt}`;

      await uploadToR2(objectKey, blob, file.type || (kind === 'thumbnail' ? 'image/jpeg' : 'video/mp4'));

      // Return path for client to store in template_previews.url (with r2: prefix)
      return NextResponse.json({ ok: true, path: `r2:${objectKey}`, kind });
    }

    return NextResponse.json({ ok: false, error: 'Unknown kind' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


