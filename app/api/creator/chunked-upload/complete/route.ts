import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { completeMultipartUpload, abortMultipartUpload, PartUploadResult } from '../../../../../lib/r2Multipart';

export const maxDuration = 60;
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

/**
 * Complete a chunked upload
 * POST /api/creator/chunked-upload/complete
 * Body: { uploadId, key, bucket, kind, parts: [{ partNumber, eTag }] }
 * Returns: { url, key }
 */
export async function POST(req: Request) {
    try {
        const ctx = await getCreatorContext(req);
        if ('error' in ctx) return ctx.error;

        const body = await req.json();
        const { uploadId, key, bucket, kind, parts } = body;

        if (!uploadId || !key || !bucket || !parts || !Array.isArray(parts)) {
            return NextResponse.json({
                ok: false,
                error: 'Missing required fields: uploadId, key, bucket, parts'
            }, { status: 400 });
        }

        // Validate parts
        for (const part of parts) {
            if (!part.partNumber || !part.eTag) {
                return NextResponse.json({
                    ok: false,
                    error: 'Each part must have partNumber and eTag'
                }, { status: 400 });
            }
        }

        // Complete the multipart upload
        const result = await completeMultipartUpload(key, uploadId, parts as PartUploadResult[], bucket);

        return NextResponse.json({
            ok: true,
            url: result.url,
            key: result.key,
            kind,
        });
    } catch (e: any) {
        console.error('Complete upload error:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to complete upload' }, { status: 500 });
    }
}

/**
 * Abort a chunked upload (cleanup on failure)
 * DELETE /api/creator/chunked-upload/complete
 * Body: { uploadId, key, bucket }
 */
export async function DELETE(req: Request) {
    try {
        const ctx = await getCreatorContext(req);
        if ('error' in ctx) return ctx.error;

        const body = await req.json();
        const { uploadId, key, bucket } = body;

        if (!uploadId || !key || !bucket) {
            return NextResponse.json({
                ok: false,
                error: 'Missing required fields: uploadId, key, bucket'
            }, { status: 400 });
        }

        // Abort the multipart upload
        await abortMultipartUpload(key, uploadId, bucket);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('Abort upload error:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to abort upload' }, { status: 500 });
    }
}
