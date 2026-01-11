import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { uploadPart, CHUNK_SIZE } from '../../../../../lib/r2Multipart';

// Configure for chunk uploads - 10MB chunks + overhead
export const maxDuration = 120; // 2 minutes per chunk
export const dynamic = 'force-dynamic';

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

/**
 * Upload a single chunk/part
 * POST /api/creator/chunked-upload/part
 * Body: FormData with fields: uploadId, key, bucket, partNumber, chunk (file)
 * Returns: { partNumber, eTag }
 */
export async function POST(req: Request) {
    try {
        const ctx = await getCreatorContext(req);
        if ('error' in ctx) return ctx.error;

        const form = await req.formData();
        const uploadId = form.get('uploadId') as string;
        const key = form.get('key') as string;
        const bucket = form.get('bucket') as 'source' | 'preview';
        const partNumber = parseInt(form.get('partNumber') as string, 10);
        const chunk = form.get('chunk') as File | null;

        if (!uploadId || !key || !bucket || !partNumber || !chunk) {
            return NextResponse.json({
                ok: false,
                error: 'Missing required fields: uploadId, key, bucket, partNumber, chunk'
            }, { status: 400 });
        }

        // Validate part number (1-indexed)
        if (partNumber < 1 || partNumber > 10000) {
            return NextResponse.json({
                ok: false,
                error: 'Invalid part number (must be 1-10000)'
            }, { status: 400 });
        }

        // Validate chunk size (max 10MB + some overhead, except for last part)
        if (chunk.size > CHUNK_SIZE + 1024) {
            return NextResponse.json({
                ok: false,
                error: `Chunk too large. Maximum chunk size is ${CHUNK_SIZE / (1024 * 1024)}MB`
            }, { status: 400 });
        }

        // Convert chunk to buffer
        const arrayBuffer = await chunk.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload part to R2
        const result = await uploadPart(key, uploadId, partNumber, buffer, bucket);

        return NextResponse.json({
            ok: true,
            partNumber: result.partNumber,
            eTag: result.eTag,
        });
    } catch (e: any) {
        console.error('Chunk upload error:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to upload chunk' }, { status: 500 });
    }
}
