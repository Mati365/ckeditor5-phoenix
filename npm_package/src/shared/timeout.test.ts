import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { timeout } from './timeout.js';

describe('timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve after specified milliseconds', async () => {
    const promise = timeout(1000);

    vi.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should not resolve before specified time', async () => {
    let resolved = false;
    const promise = timeout(1000).then(() => {
      resolved = true;
    });

    vi.advanceTimersByTime(500);

    expect(resolved).toBe(false);

    vi.advanceTimersByTime(500);
    await promise;

    expect(resolved).toBe(true);
  });

  it('should resolve immediately when milliseconds is 0', async () => {
    const promise = timeout(0);

    vi.advanceTimersByTime(0);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should handle multiple concurrent timeouts', async () => {
    const results: number[] = [];

    const promise1 = timeout(100).then(() => results.push(1));
    const promise2 = timeout(200).then(() => results.push(2));
    const promise3 = timeout(150).then(() => results.push(3));

    vi.advanceTimersByTime(100);
    await promise1;
    expect(results).toEqual([1]);

    vi.advanceTimersByTime(50);
    await promise3;
    expect(results).toEqual([1, 3]);

    vi.advanceTimersByTime(50);
    await promise2;
    expect(results).toEqual([1, 3, 2]);
  });
});
