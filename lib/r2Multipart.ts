import {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    CompletedPart
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const R2_SOURCE_BUCKET = process.env.R2_SOURCE_BUCKET || 'celite-source-files';
const R2_PREVIEWS_BUCKET = process.env.R2_PREVIEWS_BUCKET || 'celite-previews';
const R2_PREVIEWS_DOMAIN = process.env.R2_PREVIEWS_DOMAIN || 'preview.celite.in';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

export interface MultipartUploadInit {
    uploadId: string;
    key: string;
    bucket: 'source' | 'preview';
}

export interface PartUploadResult {
    partNumber: number;
    eTag: string;
}

/**
 * Initialize a multipart upload
 * @param key - The object key (path) in R2
 * @param contentType - MIME type of the file
 * @param bucket - 'source' for private bucket, 'preview' for public bucket
 * @returns Upload ID and key for subsequent part uploads
 */
export async function initMultipartUpload(
    key: string,
    contentType: string,
    bucket: 'source' | 'preview'
): Promise<MultipartUploadInit> {
    const bucketName = bucket === 'source' ? R2_SOURCE_BUCKET : R2_PREVIEWS_BUCKET;

    const command = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    });

    const response = await r2Client.send(command);

    if (!response.UploadId) {
        throw new Error('Failed to initialize multipart upload');
    }

    return {
        uploadId: response.UploadId,
        key,
        bucket,
    };
}

/**
 * Upload a single part of a multipart upload
 * @param key - The object key (path) in R2
 * @param uploadId - The upload ID from initMultipartUpload
 * @param partNumber - The part number (1-indexed)
 * @param body - The part data as Buffer
 * @param bucket - 'source' for private bucket, 'preview' for public bucket
 * @returns Part number and ETag for completing the upload
 */
export async function uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer,
    bucket: 'source' | 'preview'
): Promise<PartUploadResult> {
    const bucketName = bucket === 'source' ? R2_SOURCE_BUCKET : R2_PREVIEWS_BUCKET;

    const command = new UploadPartCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
    });

    const response = await r2Client.send(command);

    if (!response.ETag) {
        throw new Error(`Failed to upload part ${partNumber}`);
    }

    return {
        partNumber,
        eTag: response.ETag,
    };
}

/**
 * Generate presigned URLs for all parts of a multipart upload
 * This allows the browser to upload directly to R2, bypassing any server limits
 * @param key - The object key (path) in R2
 * @param uploadId - The upload ID from initMultipartUpload
 * @param totalParts - Total number of parts to generate URLs for
 * @param bucket - 'source' for private bucket, 'preview' for public bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Array of presigned URLs with their part numbers
 */
export async function getPresignedPartUrls(
    key: string,
    uploadId: string,
    totalParts: number,
    bucket: 'source' | 'preview',
    expiresIn: number = 3600
): Promise<{ partNumber: number; presignedUrl: string }[]> {
    const bucketName = bucket === 'source' ? R2_SOURCE_BUCKET : R2_PREVIEWS_BUCKET;

    const presignedUrls: { partNumber: number; presignedUrl: string }[] = [];

    for (let i = 1; i <= totalParts; i++) {
        const command = new UploadPartCommand({
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
            PartNumber: i,
        });

        const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });
        presignedUrls.push({ partNumber: i, presignedUrl });
    }

    return presignedUrls;
}

/**
 * Complete a multipart upload
 * @param key - The object key (path) in R2
 * @param uploadId - The upload ID from initMultipartUpload
 * @param parts - Array of part results from uploadPart
 * @param bucket - 'source' for private bucket, 'preview' for public bucket
 * @returns The final URL and key
 */
export async function completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: PartUploadResult[],
    bucket: 'source' | 'preview'
): Promise<{ url: string; key: string }> {
    const bucketName = bucket === 'source' ? R2_SOURCE_BUCKET : R2_PREVIEWS_BUCKET;

    // Sort parts by part number
    const sortedParts: CompletedPart[] = parts
        .sort((a, b) => a.partNumber - b.partNumber)
        .map(p => ({
            PartNumber: p.partNumber,
            ETag: p.eTag,
        }));

    const command = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: sortedParts,
        },
    });

    await r2Client.send(command);

    // Return URL based on bucket type
    if (bucket === 'source') {
        return { url: key, key };
    } else {
        const publicUrl = `https://${R2_PREVIEWS_DOMAIN}/${key}`;
        return { url: publicUrl, key };
    }
}

/**
 * Abort a multipart upload (cleanup on failure)
 * @param key - The object key (path) in R2
 * @param uploadId - The upload ID from initMultipartUpload
 * @param bucket - 'source' for private bucket, 'preview' for public bucket
 */
export async function abortMultipartUpload(
    key: string,
    uploadId: string,
    bucket: 'source' | 'preview'
): Promise<void> {
    const bucketName = bucket === 'source' ? R2_SOURCE_BUCKET : R2_PREVIEWS_BUCKET;

    const command = new AbortMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
    });

    await r2Client.send(command);
}

// Chunk size: 5MB (S3/R2 multipart minimum is 5MB except for last part)
// NOTE: Requires Vercel Pro plan (50MB body limit). Hobby plan is too small.
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// Maximum file size: 1GB
export const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1GB
