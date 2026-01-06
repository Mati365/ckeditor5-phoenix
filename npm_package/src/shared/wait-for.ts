import type { CanBePromise } from '../types';

/**
 * Waits for the provided callback to succeed. The callback is executed multiple times until it succeeds or the timeout is reached.
 * It's executed immediately and then with a delay defined by the `retry` option.
 *
 * @param callback The callback to execute.
 * @param config Configuration for the function.
 * @param config.timeOutAfter The maximum time to wait for the callback to succeed, in milliseconds. Default is 500ms.
 * @param config.retryAfter The time to wait between retries, in milliseconds. Default is 100ms.
 * @returns A promise that resolves when the callback succeeds.
 */
export function waitFor<R>(
  callback: () => CanBePromise<R>,
  {
    timeOutAfter = 500,
    retryAfter = 100,
  }: WaitForConfig = {},
): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    const startTime = Date.now();
    let lastError: Error | null = null;

    const timeoutTimerId = setTimeout(() => {
      reject(lastError ?? new Error('Timeout'));
    }, timeOutAfter);

    const tick = async () => {
      try {
        const result = await callback();
        clearTimeout(timeoutTimerId);
        resolve(result);
      }
      catch (err: any) {
        lastError = err;

        if (Date.now() - startTime > timeOutAfter) {
          reject(err);
        }
        else {
          setTimeout(tick, retryAfter);
        }
      }
    };

    void tick();
  });
}

/**
 * Configuration for the `waitFor` function.
 */
export type WaitForConfig = {
  timeOutAfter?: number;
  retryAfter?: number;
};
