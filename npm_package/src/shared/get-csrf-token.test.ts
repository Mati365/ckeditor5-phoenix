import { afterEach, describe, expect, it } from 'vitest';

import { getCsrfToken } from './get-csrf-token';

describe('getCsrfToken', () => {
  afterEach(() => {
    document.head.innerHTML = '';

    // Clear cookies by expiring them
    const cookies = document.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i]!;
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;

      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  });

  it('should return null if no token is found', () => {
    expect(getCsrfToken()).toBeNull();
  });

  it('should retrieve token from meta tag', () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'meta-token-123';
    document.head.appendChild(meta);

    expect(getCsrfToken()).toBe('meta-token-123');
  });

  it('should retrieve token from cookie', () => {
    document.cookie = '_csrf_token=cookie-token-456; other=value';
    expect(getCsrfToken()).toBe('cookie-token-456');
  });

  it('should prioritize meta tag over cookie', () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'meta-token-789';
    document.head.appendChild(meta);

    document.cookie = '_csrf_token=cookie-token-000';

    expect(getCsrfToken()).toBe('meta-token-789');
  });

  it('should handle URL encoded cookie values', () => {
    document.cookie = '_csrf_token=token%20with%20spaces';
    expect(getCsrfToken()).toBe('token with spaces');
  });
});
