import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { initMultipartUpload, getPresignedPartUrls, MAX_FILE_SIZE, CHUNK_SIZE } from '../../../../../lib/r2Multipart';
import { generateSourceKey, generateVideoKey, generateThumbnailKey, generateAudioPreviewKey, generateModel3DKey, generateTemplateFolder } from '../../../../../lib/r2Client';

// No body size limit needed - this just initiates the upload and returns presigned URLs
export const maxDuration = 60; // Allow more time to generate presigned URLs
export const dynamic = 'force-dynamic';

const R2_PREVIEWS_DOMAIN = process.env.R2_PREVIEWS_DOMAIN || 'preview.celite.in';

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
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (shopErr || !shop) {
        return { error: NextResponse.json({ ok: false, error: 'No creator shop found' }, { status: 404 }) };
    }

    return { admin, userId, shop };
}

function extFromName(name: string): string {
    const idx = name.lastIndexOf('.');
    return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

/**
 * Initialize a chunked upload with presigned URLs for direct browser-to-R2 upload
 * POST /api/creator/chunked-upload/init
 * Body: { kind, category_id, subcategory_id?, sub_subcategory_id?, slug?, template_name, filename, contentType, fileSize }
 * Returns: { uploadId, key, bucket, chunkSize, totalChunks, presignedUrls, publicUrl }
 */
export async function POST(req: Request) {
    try {
        const ctx = await getCreatorContext(req);
        if ('error' in ctx) return ctx.error;
        const { admin } = ctx;

        const body = await req.json();
        const {
            kind,
            category_id,
            subcategory_id,
            sub_subcategory_id,
            slug,
            template_name,
            filename,
            contentType,
            fileSize
        } = body;

        if (!kind || !category_id || !template_name || !filename || !fileSize) {
            return NextResponse.json({
                ok: false,
                error: 'Missing required fields: kind, category_id, template_name, filename, fileSize'
            }, { status: 400 });
        }

        // Validate file size (max 1GB)
        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json({
                ok: false,
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024 * 1024)} GB`
            }, { status: 400 });
        }

        // Fetch category and subcategory slugs
        const { data: category } = await admin
            .from('categories')
            .select('slug')
            .eq('id', category_id)
            .maybeSingle();

        if (!category) {
            return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 400 });
        }

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

        // Generate file key based on kind
        let defaultExt = '.zip';
        if (kind === 'video') defaultExt = '.mp4';
        else if (kind === 'thumbnail') defaultExt = '.jpg';
        else if (kind === 'audio_preview') defaultExt = '.mp3';
        else if (kind === 'model_3d') defaultExt = '.glb';

        const ext = extFromName(filename) || defaultExt;
        const finalFilename = slug ? `${slug}${ext}` : filename;
        const templateFolder = generateTemplateFolder(template_name);

        let r2Key: string;
        let bucket: 'source' | 'preview';

        if (kind === 'source') {
            r2Key = generateSourceKey(category.slug, subcategorySlug, subSubcategorySlug, templateFolder, finalFilename);
            bucket = 'source';
        } else if (kind === 'video') {
            r2Key = generateVideoKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
            bucket = 'preview';
        } else if (kind === 'thumbnail') {
            r2Key = generateThumbnailKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
            bucket = 'preview';
        } else if (kind === 'audio_preview') {
            r2Key = generateAudioPreviewKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
            bucket = 'preview';
        } else if (kind === 'model_3d') {
            r2Key = generateModel3DKey(category.slug, subcategorySlug, finalFilename, subSubcategorySlug, templateFolder);
            bucket = 'preview';
        } else {
            return NextResponse.json({
                ok: false,
                error: 'Invalid kind. Use "source", "video", "thumbnail", "audio_preview", or "model_3d"'
            }, { status: 400 });
        }

        // Initialize multipart upload
        const result = await initMultipartUpload(r2Key, contentType || 'application/octet-stream', bucket);

        // Calculate total chunks
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

        // Generate presigned URLs for all parts (direct browser upload)
        const presignedUrls = await getPresignedPartUrls(r2Key, result.uploadId, totalChunks, bucket);

        // Calculate the final public URL (for preview bucket)
        const publicUrl = bucket === 'preview'
            ? `https://${R2_PREVIEWS_DOMAIN}/${r2Key}`
            : r2Key;

        return NextResponse.json({
            ok: true,
            uploadId: result.uploadId,
            key: result.key,
            bucket: result.bucket,
            chunkSize: CHUNK_SIZE,
            totalChunks,
            kind,
            presignedUrls, // Array of { partNumber, presignedUrl } for direct browser upload
            publicUrl, // The final URL after upload completes
        });
    } catch (e: any) {
        console.error('Chunked upload init error:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to initialize upload' }, { status: 500 });
    }
}
