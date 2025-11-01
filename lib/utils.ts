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

