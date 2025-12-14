import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a YouTube URL to an embed URL format
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * Returns the embed URL or null if invalid
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;
  
  // Already an embed URL
  if (trimmedUrl.includes('youtube.com/embed/')) {
    return trimmedUrl;
  }
  
  // Extract video ID from various YouTube URL formats
  let videoId: string | null = null;
  
  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmedUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // Format: https://youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = trimmedUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }
  }
  
  // Format: https://www.youtube.com/embed/VIDEO_ID
  if (!videoId) {
    const embedMatch = trimmedUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }
  }

  // Format: https://www.youtube.com/shorts/VIDEO_ID
  if (!videoId) {
    const shortsMatch = trimmedUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      videoId = shortsMatch[1];
    }
  }
  
  // If we have a video ID, return embed URL
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // If it looks like a direct video ID (11 characters), use it
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return `https://www.youtube.com/embed/${trimmedUrl}`;
  }
  
  return null;
}

/**
 * Extracts the YouTube video ID from a YouTube URL
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * Returns the video ID or null if invalid
 */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;
  
  // Extract video ID from various YouTube URL formats
  let videoId: string | null = null;
  
  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmedUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // Format: https://youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = trimmedUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }
  }
  
  // Format: https://www.youtube.com/embed/VIDEO_ID
  if (!videoId) {
    const embedMatch = trimmedUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }
  }

  // Format: https://www.youtube.com/shorts/VIDEO_ID
  if (!videoId) {
    const shortsMatch = trimmedUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      videoId = shortsMatch[1];
    }
  }
  
  // If it looks like a direct video ID (11 characters), use it
  if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    videoId = trimmedUrl;
  }
  
  return videoId;
}

/**
 * Gets the YouTube thumbnail URL from a YouTube video URL or video ID
 * Returns the maxresdefault thumbnail URL (highest quality) or null if invalid
 * Format: https://img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg
 */
export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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

