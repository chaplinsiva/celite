/**
 * Utility functions for authentication redirects
 */

/**
 * Get the current page URL (pathname + search params) for use as return URL
 */
export function getCurrentPageUrl(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname + window.location.search;
}

/**
 * Get login URL with return parameter
 */
export function getLoginUrl(returnUrl?: string): string {
  const url = returnUrl || getCurrentPageUrl();
  return `/login?return=${encodeURIComponent(url)}`;
}

/**
 * Get signup URL with return parameter
 */
export function getSignupUrl(returnUrl?: string): string {
  const url = returnUrl || getCurrentPageUrl();
  return `/signup?return=${encodeURIComponent(url)}`;
}

