/**
 * Returns a promise that resolves after a specified number of milliseconds.
 *
 * @param ms The number of milliseconds to wait.
 * @returns A promise that resolves after the specified time.
 */
export function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
