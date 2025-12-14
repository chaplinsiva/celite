import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 is S3-compatible, so we use AWS SDK
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const BUCKET_NAME = process.env.R2_SOURCE_BUCKET || '';
const R2_PUBLIC_URL = process.env.R2_DIRECT_BASE_URL || '';

// Validate that R2_ENDPOINT doesn't contain template strings
if (R2_ENDPOINT && (R2_ENDPOINT.includes('${') || R2_ENDPOINT.includes('${r2_account_id}'))) {
  console.error('Invalid R2_ENDPOINT: contains template string. Please set the actual endpoint URL.');
  throw new Error('R2_ENDPOINT environment variable contains template string. Set it to the actual endpoint URL (e.g., https://your-account-id.r2.cloudflarestorage.com)');
}

// Validate that R2_PUBLIC_URL doesn't contain template strings
if (R2_PUBLIC_URL && (R2_PUBLIC_URL.includes('${') || R2_PUBLIC_URL.includes('${r2_account_id}'))) {
  console.error('Invalid R2_DIRECT_BASE_URL: contains template string. Please set the actual public URL.');
  throw new Error('R2_DIRECT_BASE_URL environment variable contains template string. Set it to the actual public URL (e.g., https://cdn.celite.in)');
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file to Cloudflare R2
 * @param file - The file to upload (File or Buffer)
 * @param key - The object key (path) in R2 (e.g., "category/subcategory/source.zip")
 * @param contentType - MIME type (e.g., 'application/zip', 'image/jpeg', 'video/mp4')
 * @returns The public URL and key of the uploaded file
 */
export async function uploadToR2(
  file: File | Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  let body: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
  } else {
    body = file;
  }
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Construct public URL
  let publicUrl: string;
  if (R2_PUBLIC_URL) {
    publicUrl = `${R2_PUBLIC_URL}/${key}`;
  } else if (R2_ENDPOINT && BUCKET_NAME) {
    // Construct URL from endpoint: replace https:// with https://bucket-name.
    publicUrl = `${R2_ENDPOINT.replace('https://', `https://${BUCKET_NAME}.`)}/${key}`;
  } else {
    throw new Error('R2 configuration error: Either R2_DIRECT_BASE_URL or both R2_ENDPOINT and R2_SOURCE_BUCKET must be set');
  }

  return {
    url: publicUrl,
    key,
  };
}

/**
 * Delete a file from Cloudflare R2
 * @param key - The object key (path) in R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Get a file from Cloudflare R2 (for secure source file downloads)
 * @param key - The object key (path) in R2
 * @returns The file buffer and content type
 */
export async function getFileFromR2(key: string): Promise<{ body: Buffer; contentType: string }> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  
  if (!response.Body) {
    throw new Error('File not found in R2');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return {
    body: buffer,
    contentType: response.ContentType || 'application/octet-stream',
  };
}

/**
 * Extract R2 key from a public R2 URL
 * @param url - The public R2 URL
 * @returns The R2 key (path) or null if not a valid R2 URL
 */
export function extractR2KeyFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Check if it's a public R2 URL
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.replace(R2_PUBLIC_URL + '/', '');
  }
  
  // Check if it's the endpoint-based URL
  const endpointUrl = `${R2_ENDPOINT?.replace('https://', `https://${BUCKET_NAME}.`)}/`;
  if (url.startsWith(endpointUrl)) {
    return url.replace(endpointUrl, '');
  }
  
  return null;
}

/**
 * Generate R2 key path for source files: category/subcategory/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param filename - Filename with extension
 */
export function generateSourceKey(categorySlug: string, subcategorySlug: string | null, filename: string): string {
  if (subcategorySlug) {
    return `${categorySlug}/${subcategorySlug}/${filename}`;
  }
  return `${categorySlug}/${filename}`;
}

/**
 * Generate R2 key path for preview files: category/subcategory/preview/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param filename - Filename with extension
 */
export function generatePreviewKey(categorySlug: string, subcategorySlug: string | null, filename: string): string {
  if (subcategorySlug) {
    return `${categorySlug}/${subcategorySlug}/preview/${filename}`;
  }
  return `${categorySlug}/preview/${filename}`;
}

/**
 * Generate R2 key path for video files: category/subcategory/video/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param filename - Filename with extension
 */
export function generateVideoKey(categorySlug: string, subcategorySlug: string | null, filename: string): string {
  if (subcategorySlug) {
    return `${categorySlug}/${subcategorySlug}/video/${filename}`;
  }
  return `${categorySlug}/video/${filename}`;
}

/**
 * Generate R2 key path for thumbnail files: category/subcategory/thumbnail/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param filename - Filename with extension
 */
export function generateThumbnailKey(categorySlug: string, subcategorySlug: string | null, filename: string): string {
  if (subcategorySlug) {
    return `${categorySlug}/${subcategorySlug}/thumbnail/${filename}`;
  }
  return `${categorySlug}/thumbnail/${filename}`;
}

/**
 * Generate R2 key path for audio preview files: category/subcategory/audio/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param filename - Filename with extension
 */
export function generateAudioPreviewKey(categorySlug: string, subcategorySlug: string | null, filename: string): string {
  if (subcategorySlug) {
    return `${categorySlug}/${subcategorySlug}/audio/${filename}`;
  }
  return `${categorySlug}/audio/${filename}`;
}

/**
 * Generate R2 key path for 3D model files: category/subcategory/model/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param filename - Filename with extension
 */
export function generateModel3DKey(categorySlug: string, subcategorySlug: string | null, filename: string): string {
  if (subcategorySlug) {
    return `${categorySlug}/${subcategorySlug}/model/${filename}`;
  }
  return `${categorySlug}/model/${filename}`;
}

