import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client } from '@aws-sdk/client-s3';

// R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const R2_PREVIEWS_BUCKET = process.env.R2_PREVIEWS_BUCKET || 'celite-previews';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

interface RouteContext {
    params: Promise<{ slug: string }>;
}

/**
 * Get a short-lived signed URL for audio preview streaming
 * This prevents direct access to audio files via public URLs
 */
export async function GET(
    req: Request,
    context: RouteContext
) {
    try {
        const params = await context.params;
        const slug = params.slug;

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }

        const admin = getSupabaseAdminClient();

        // Get the template's audio preview path
        const { data: template, error: templateError } = await admin
            .from('templates')
            .select('audio_preview_path, name')
            .eq('slug', slug)
            .maybeSingle();

        if (templateError || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        if (!template.audio_preview_path) {
            return NextResponse.json({ error: 'No audio preview available' }, { status: 404 });
        }

        // Extract the R2 key from the URL
        // The audio_preview_path is stored as: https://preview.celite.in/preview/audio/...
        // We need to extract: preview/audio/...
        let r2Key = template.audio_preview_path;

        // If it's a full URL, extract the path
        if (r2Key.includes('preview.celite.in/')) {
            r2Key = r2Key.split('preview.celite.in/')[1];
        } else if (r2Key.startsWith('https://')) {
            // Handle other URL formats
            const url = new URL(r2Key);
            r2Key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        }

        // Generate a signed URL with 30 second expiry
        // This makes it very hard to share or download the URL
        const command = new GetObjectCommand({
            Bucket: R2_PREVIEWS_BUCKET,
            Key: r2Key,
        });

        const signedUrl = await getSignedUrl(r2Client, command, {
            expiresIn: 30 // 30 seconds - very short lived
        });

        // Return the signed URL
        // The client will use this to load audio into a blob
        return NextResponse.json({
            url: signedUrl,
            expires: 30
        });

    } catch (error: any) {
        console.error('Error generating audio preview URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate audio preview URL' },
            { status: 500 }
        );
    }
}

