/**
 * Alternative upload endpoint that uses Cloudflare Worker for CORS support
 * 
 * This endpoint generates a worker URL instead of a direct R2 presigned URL.
 * The worker handles CORS headers automatically.
 * 
 * To use this:
 * 1. Set up Cloudflare Worker (see R2_CORS_SETUP.md)
 * 2. Set WORKER_UPLOAD_DOMAIN environment variable (e.g., previews.celite.in)
 * 3. Update creator dashboard to use this endpoint instead of presigned-upload
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { generateSourceKey, generateVideoKey, generateThumbnailKey, generateAudioPreviewKey, generateModel3DKey, generateTemplateFolder } from '../../../../lib/r2Client';

async function getCreatorContext(req: Request) {
  const admin = getSupabaseAdminClient();

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) {
    return { error: NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 }) };
  }

  const userId = userRes.user.id;

  const { data: shop, error: shopErr } = await admin
    .from('creator_shops')
    .select('id, direct_upload_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (shopErr || !shop) {
    return { error: NextResponse.json({ ok: false, error: 'No creator shop found' }, { status: 404 }) };
  }

  if (!shop.direct_upload_enabled) {
    return { error: NextResponse.json({ ok: false, error: 'Direct upload is not enabled for your account' }, { status: 403 }) };
  }

  return { admin, userId, shop };
}

function extFromName(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

export async function POST(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin } = ctx;

    const body = await req.json();
    const { kind, category_id, subcategory_id, sub_subcategory_id, slug, template_name, filename, contentType } = body;

    if (!kind || !category_id || !template_name) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if worker domain is configured
    const WORKER_UPLOAD_DOMAIN = process.env.WORKER_UPLOAD_DOMAIN || 'previews.celite.in';
    if (!WORKER_UPLOAD_DOMAIN) {
      return NextResponse.json({ ok: false, error: 'Worker upload domain not configured' }, { status: 500 });
    }

    // Fetch category and subcategory slugs
    const { data: category } = await admin
      .from('categories')
      .select('slug')
      .eq('id', category_id)
      .maybeSingle();

    if (!category) return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 400 });

    let subcategorySlug: string | null = null;
    if (subcategory_id) {
      const { data: subcategory } = await admin
        .from('subcategories')
        .select('slug')
        .eq('id', subcategory_id)
        .maybeSingle();
      if (subcategory) {
        subcategorySlug = subcategory.slug;
      }
    }

    let subSubcategorySlug: string | null = null;
    if (sub_subcategory_id) {
      const { data: subSubcategory } = await admin
        .from('sub_subcategories')
        .select('slug')
        .eq('id', sub_subcategory_id)
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
    
    const ext = filename ? extFromName(filename) : defaultExt;
    const finalFilename = slug ? `${slug}${ext}` : filename || `file${ext}`;
    
    // Generate template folder name from template name
    const templateFolder = generateTemplateFolder(template_name);

    let r2Key: string;
    let bucket: 'source' | 'preview';
    
    if (kind === 'source') {
      bucket = 'source';
      r2Key = generateSourceKey(category.slug, subcategorySlug, subSubcategorySlug, templateFolder, finalFilename);
    } else if (kind === 'video') {
      bucket = 'preview';
      r2Key = generateVideoKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
    } else if (kind === 'thumbnail') {
      bucket = 'preview';
      r2Key = generateThumbnailKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
    } else if (kind === 'audio_preview') {
      bucket = 'preview';
      r2Key = generateAudioPreviewKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
    } else if (kind === 'model_3d') {
      bucket = 'preview';
      r2Key = generateModel3DKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid kind' }, { status: 400 });
    }

    // Generate worker URL instead of presigned URL
    // Worker will handle CORS and upload to R2
    const workerUrl = `https://${WORKER_UPLOAD_DOMAIN}/${r2Key}`;

    return NextResponse.json({
      ok: true,
      uploadUrl: workerUrl, // Use worker URL instead of presigned URL
      key: r2Key,
      bucket,
      kind
    });
  } catch (e: any) {
    console.error('Worker upload URL generation error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Failed to generate upload URL' 
    }, { status: 500 });
  }
}

