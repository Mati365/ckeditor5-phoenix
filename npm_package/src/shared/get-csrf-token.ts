/**
 * Retrieves the CSRF token from the meta tag or cookie.
 *
 * @returns The CSRF token or null if not found.
 */
export function getCsrfToken(): string | null {
  // Try to get from meta tag (Phoenix default).
  const metaTag = document.querySelector('meta[name="csrf-token"]');

  if (metaTag) {
    return metaTag.getAttribute('content');
  }

  // Try to get from cookie.
  const match = document.cookie.match(/(?:^|; )_csrf_token=([^;]*)/);

  return match ? decodeURIComponent(match[1]!) : null;
}
