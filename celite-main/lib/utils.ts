import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts R2 URLs (old public domain) to CDN domain (cdn.celite.in)
 * Handles URLs like:
 * - https://pub-b9152990a77046c58456a70ba30a3821.r2.dev/path/to/file
 * - https://cdn.celite.in/path/to/file (already correct, returns as-is)
 * - Other URLs (returns as-is)
 * @param url - The URL to convert
 * @returns The URL with cdn.celite.in domain or the original URL if not an R2 URL
 */
export function convertR2UrlToCdn(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return url || null;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;
  
  // If already using cdn.celite.in, return as-is
  if (trimmedUrl.includes('cdn.celite.in')) {
    return trimmedUrl;
  }
  
  // Check if it's an old R2 URL (pub-*.r2.dev)
  const r2UrlMatch = trimmedUrl.match(/^https?:\/\/(pub-[a-zA-Z0-9]+\.r2\.dev)(\/.+)?$/);
  if (r2UrlMatch) {
    const path = r2UrlMatch[2] || '';
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `https://cdn.celite.in/${cleanPath}`;
  }
  
  // Check for any r2.dev domain
  if (trimmedUrl.includes('.r2.dev')) {
    try {
      const urlObj = new URL(trimmedUrl);
      const path = urlObj.pathname;
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `https://cdn.celite.in/${cleanPath}`;
    } catch {
      // Invalid URL, return as-is
      return trimmedUrl;
    }
  }
  
  // Not an R2 URL, return as-is
  return trimmedUrl;
}

