/* agent-notes: { ctx: "Media format, size calculation, and backup path utilities", deps: ["lib/utils.ts"], state: active, last: "sato@2026-07-28" } */

/**
 * Format bytes into human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0 || isNaN(bytes)) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calculate file size savings and percentage reduction
 */
export function calculateSavings(originalBytes: number, compressedBytes: number): { savingsBytes: number; savingsPercent: number } {
  if (!originalBytes || originalBytes <= 0 || !compressedBytes || compressedBytes <= 0) {
    return { savingsBytes: 0, savingsPercent: 0 };
  }
  const savingsBytes = Math.max(0, originalBytes - compressedBytes);
  const savingsPercent = parseFloat(((savingsBytes / originalBytes) * 100).toFixed(1));
  return { savingsBytes, savingsPercent };
}

/**
 * Generate R2 backup key for original uncompressed file
 */
export function getOriginalBackupKey(keyOrUrl: string): string {
  if (!keyOrUrl) return '';
  // Strip protocol/domain if present
  const cleanPath = keyOrUrl.replace(/^https?:\/\/[^\/]+\//, '');
  const filename = cleanPath.split('/').pop() || 'file';
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const ext = filename.split('.').pop() || 'bin';
  return `previews/originals/${nameWithoutExt}-original.${ext}`;
}

/**
 * Check if filename/URL is a compressible image format
 */
export function isCompressibleImage(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath) return false;
  return /\.(png|jpe?g|webp|bmp|tiff)$/i.test(urlOrPath);
}

/**
 * Check if filename/URL is a compressible video format
 */
export function isCompressibleVideo(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath) return false;
  return /\.(mp4|webm|mov|mkv|avi)$/i.test(urlOrPath);
}
