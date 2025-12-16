import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 is S3-compatible, so we use AWS SDK
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const R2_SOURCE_BUCKET = process.env.R2_SOURCE_BUCKET || 'celite-source-files';
const R2_PREVIEWS_BUCKET = process.env.R2_PREVIEWS_BUCKET || 'celite-previews';
const R2_PREVIEWS_DOMAIN = process.env.R2_PREVIEWS_DOMAIN || 'preview.celite.in';

// Validate R2 configuration (only at runtime, not during build)
function validateR2Config() {
  // Validate that R2_ENDPOINT doesn't contain template strings
  if (R2_ENDPOINT && (R2_ENDPOINT.includes('${') || R2_ENDPOINT.includes('${r2_account_id}'))) {
    console.error('Invalid R2_ENDPOINT: contains template string. Please set the actual endpoint URL.');
    const suggestion = R2_ACCOUNT_ID 
      ? `\n\nSOLUTION: Either:\n1. Set R2_ENDPOINT=https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com\n2. Or remove R2_ENDPOINT and let it auto-generate from R2_ACCOUNT_ID`
      : '\n\nSOLUTION: Set R2_ENDPOINT to your actual endpoint URL (e.g., https://your-account-id.r2.cloudflarestorage.com) or set R2_ACCOUNT_ID to auto-generate it.';
    throw new Error('R2_ENDPOINT environment variable contains template string. Set it to the actual endpoint URL (e.g., https://your-account-id.r2.cloudflarestorage.com)' + suggestion);
  }
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
 * Upload a source file to private R2 bucket (celite-source-files)
 * @param file - The file to upload (File or Buffer)
 * @param key - The object key (path) in R2
 * @param contentType - MIME type (e.g., 'application/zip')
 * @returns The key of the uploaded file (no public URL for private bucket)
 */
export async function uploadSourceToR2(
  file: File | Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  validateR2Config();
  
  // Validate bucket name
  if (!R2_SOURCE_BUCKET || R2_SOURCE_BUCKET.trim() === '') {
    throw new Error('R2_SOURCE_BUCKET environment variable is not set. Please configure it in your .env.local file.');
  }
  
  // Validate credentials
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are missing. Please set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in your .env.local file.');
  }
  
  let body: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
  } else {
    body = file;
  }
  
  const command = new PutObjectCommand({
    Bucket: R2_SOURCE_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  try {
    await r2Client.send(command);
    console.log(`[R2] Successfully uploaded source file to ${R2_SOURCE_BUCKET}/${key}`);
  } catch (error: any) {
    console.error(`[R2] Failed to upload source file to ${R2_SOURCE_BUCKET}/${key}:`, error);
    // Provide more helpful error messages
    if (error.name === 'NoSuchBucket') {
      throw new Error(`R2 bucket "${R2_SOURCE_BUCKET}" does not exist. Please create it in your Cloudflare R2 dashboard.`);
    } else if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
      throw new Error('Invalid R2 credentials. Please check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.');
    } else if (error.message) {
      throw new Error(`R2 upload failed: ${error.message}`);
    } else {
      throw new Error(`R2 upload failed: ${error}`);
    }
  }

  // Return key only (private bucket, no public URL)
  return {
    url: key, // Store key as URL for reference
    key,
  };
}

/**
 * Upload a preview file to public R2 bucket (celite-previews)
 * @param file - The file to upload (File or Buffer)
 * @param key - The object key (path) in R2
 * @param contentType - MIME type (e.g., 'image/jpeg', 'video/mp4')
 * @returns The public URL and key of the uploaded file
 */
export async function uploadPreviewToR2(
  file: File | Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  validateR2Config();
  
  let body: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
  } else {
    body = file;
  }
  
  const command = new PutObjectCommand({
    Bucket: R2_PREVIEWS_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Construct public URL using preview domain
  const publicUrl = `https://${R2_PREVIEWS_DOMAIN}/${key}`;

  return {
    url: publicUrl,
    key,
  };
}

/**
 * @deprecated Use uploadSourceToR2 or uploadPreviewToR2 instead
 * Upload a file to Cloudflare R2 (legacy function)
 */
export async function uploadToR2(
  file: File | Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  // Default to preview bucket for backward compatibility
  return uploadPreviewToR2(file, key, contentType);
}

/**
 * Delete a source file from private R2 bucket
 * @param key - The object key (path) in R2
 */
export async function deleteSourceFromR2(key: string): Promise<void> {
  validateR2Config();
  
  const command = new DeleteObjectCommand({
    Bucket: R2_SOURCE_BUCKET,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Delete a preview file from public R2 bucket
 * @param key - The object key (path) in R2
 */
export async function deletePreviewFromR2(key: string): Promise<void> {
  validateR2Config();
  
  const command = new DeleteObjectCommand({
    Bucket: R2_PREVIEWS_BUCKET,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * @deprecated Use deleteSourceFromR2 or deletePreviewFromR2 instead
 * Delete a file from Cloudflare R2 (legacy function)
 */
export async function deleteFromR2(key: string): Promise<void> {
  // Default to preview bucket for backward compatibility
  return deletePreviewFromR2(key);
}

/**
 * Get a source file from private R2 bucket (for secure downloads)
 * @param key - The object key (path) in R2
 * @returns The file buffer and content type
 */
export async function getSourceFileFromR2(key: string): Promise<{ body: Buffer; contentType: string }> {
  validateR2Config();
  
  // Validate bucket name
  if (!R2_SOURCE_BUCKET || R2_SOURCE_BUCKET.trim() === '') {
    throw new Error('R2_SOURCE_BUCKET environment variable is not set');
  }
  
  // Validate credentials
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are missing');
  }
  
  const command = new GetObjectCommand({
    Bucket: R2_SOURCE_BUCKET,
    Key: key,
  });

  try {
    const response = await r2Client.send(command);
    
    if (!response.Body) {
      throw new Error(`File not found in R2: ${key}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      throw new Error(`File is empty in R2: ${key}`);
    }

    return {
      body: buffer,
      contentType: response.ContentType || 'application/octet-stream',
    };
  } catch (error: any) {
    // Provide more detailed error information
    if (error.name === 'NoSuchKey') {
      throw new Error(`File not found in R2 bucket: ${key}`);
    } else if (error.name === 'NoSuchBucket') {
      throw new Error(`R2 bucket "${R2_SOURCE_BUCKET}" does not exist`);
    } else if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
      throw new Error('Invalid R2 credentials');
    } else {
      throw new Error(`R2 error: ${error.message || error}`);
    }
  }
}

/**
 * Generate a signed URL for downloading a source file from private R2 bucket
 * @param key - The object key (path) in R2
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns The signed URL
 */
export async function getSignedSourceUrl(key: string, expiresIn: number = 3600): Promise<string> {
  validateR2Config();
  
  const command = new GetObjectCommand({
    Bucket: R2_SOURCE_BUCKET,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return signedUrl;
}

/**
 * Generate a presigned URL for direct upload to R2 (for creators with direct upload enabled)
 * @param key - The object key (path) in R2
 * @param contentType - MIME type of the file
 * @param bucket - The bucket name ('source' or 'preview')
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns The presigned URL for PUT request
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  bucket: 'source' | 'preview',
  expiresIn: number = 3600
): Promise<string> {
  validateR2Config();
  
  const bucketName = bucket === 'source' ? R2_SOURCE_BUCKET : R2_PREVIEWS_BUCKET;
  
  if (!bucketName || bucketName.trim() === '') {
    throw new Error(`R2_${bucket.toUpperCase()}_BUCKET environment variable is not set`);
  }
  
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are missing');
  }
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return presignedUrl;
}

/**
 * @deprecated Use getSourceFileFromR2 instead
 * Get a file from Cloudflare R2 (legacy function)
 */
export async function getFileFromR2(key: string): Promise<{ body: Buffer; contentType: string }> {
  return getSourceFileFromR2(key);
}

/**
 * Extract R2 key from a preview URL
 * @param url - The preview URL
 * @returns The R2 key (path) or null if not a valid preview URL
 */
export function extractR2KeyFromPreviewUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Check if it's a preview domain URL
  if (url.includes(R2_PREVIEWS_DOMAIN)) {
    return url.replace(`https://${R2_PREVIEWS_DOMAIN}/`, '');
  }
  
  return null;
}

/**
 * @deprecated Use extractR2KeyFromPreviewUrl instead
 * Extract R2 key from a public R2 URL (legacy function)
 */
export function extractR2KeyFromUrl(url: string): string | null {
  return extractR2KeyFromPreviewUrl(url);
}

/**
 * Generate R2 key path for source files: category/subcategory/sub-subcategory/{templateFolder}/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param subSubcategorySlug - Sub-subcategory slug (optional)
 * @param templateFolder - Template folder name (from template name)
 * @param filename - Filename with extension
 */
export function generateSourceKey(
  categorySlug: string, 
  subcategorySlug: string | null, 
  subSubcategorySlug: string | null | undefined,
  templateFolder: string | null | undefined,
  filename: string
): string {
  const parts: string[] = [];
  if (categorySlug) parts.push(categorySlug);
  if (subcategorySlug) parts.push(subcategorySlug);
  if (subSubcategorySlug) parts.push(subSubcategorySlug);
  if (templateFolder) parts.push(templateFolder);
  parts.push(filename);
  return parts.join('/');
}

/**
 * Generate R2 key path for preview files: preview/{previewType}/category/subcategory/sub-subcategory/{templateFolder}/{filename}
 * @param previewType - Type of preview: 'thumbnail', 'video', 'audio', 'model'
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param subSubcategorySlug - Sub-subcategory slug (optional)
 * @param templateFolder - Template folder name (from template name)
 * @param filename - Filename with extension
 */
export function generatePreviewKey(
  previewType: 'thumbnail' | 'video' | 'audio' | 'model',
  categorySlug: string, 
  subcategorySlug: string | null, 
  filename: string, 
  subSubcategorySlug?: string | null,
  templateFolder?: string | null
): string {
  const parts = ['preview', previewType];
  if (categorySlug) parts.push(categorySlug);
  if (subcategorySlug) parts.push(subcategorySlug);
  if (subSubcategorySlug) parts.push(subSubcategorySlug);
  if (templateFolder) parts.push(templateFolder);
  parts.push(filename);
  return parts.join('/');
}

/**
 * Generate R2 key path for video files: preview/video/category/subcategory/sub-subcategory/{templateFolder}/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param subSubcategorySlug - Sub-subcategory slug (optional)
 * @param templateFolder - Template folder name (from template name)
 * @param filename - Filename with extension
 */
export function generateVideoKey(
  categorySlug: string, 
  subcategorySlug: string | null, 
  filename: string, 
  subSubcategorySlug?: string | null,
  templateFolder?: string | null
): string {
  return generatePreviewKey('video', categorySlug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
}

/**
 * Generate R2 key path for thumbnail files: preview/thumbnail/category/subcategory/sub-subcategory/{templateFolder}/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param subSubcategorySlug - Sub-subcategory slug (optional)
 * @param templateFolder - Template folder name (from template name)
 * @param filename - Filename with extension
 */
export function generateThumbnailKey(
  categorySlug: string, 
  subcategorySlug: string | null, 
  filename: string, 
  subSubcategorySlug?: string | null,
  templateFolder?: string | null
): string {
  return generatePreviewKey('thumbnail', categorySlug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
}

/**
 * Generate R2 key path for audio preview files: preview/audio/category/subcategory/sub-subcategory/{templateFolder}/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param subSubcategorySlug - Sub-subcategory slug (optional)
 * @param templateFolder - Template folder name (from template name)
 * @param filename - Filename with extension
 */
export function generateAudioPreviewKey(
  categorySlug: string, 
  subcategorySlug: string | null, 
  filename: string, 
  subSubcategorySlug?: string | null,
  templateFolder?: string | null
): string {
  return generatePreviewKey('audio', categorySlug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
}

/**
 * Generate R2 key path for 3D model files: preview/model/category/subcategory/sub-subcategory/{templateFolder}/{filename}
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param subSubcategorySlug - Sub-subcategory slug (optional)
 * @param templateFolder - Template folder name (from template name)
 * @param filename - Filename with extension
 */
export function generateModel3DKey(
  categorySlug: string, 
  subcategorySlug: string | null, 
  filename: string, 
  subSubcategorySlug?: string | null,
  templateFolder?: string | null
): string {
  return generatePreviewKey('model', categorySlug, subcategorySlug, filename, subSubcategorySlug, templateFolder);
}

/**
 * Generate a folder name from template name (sanitized for use in file paths)
 * @param templateName - Template name
 * @returns Sanitized folder name
 */
export function generateTemplateFolder(templateName: string): string {
  return templateName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

