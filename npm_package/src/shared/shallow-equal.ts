/**
 * Performs a shallow comparison of two objects.
 *
 * @param objA - The first object to compare.
 * @param objB - The second object to compare.
 * @returns True if the objects are shallowly equal, false otherwise.
 */
export function shallowEqual<T extends Record<string, unknown>>(
  objA: T,
  objB: T,
): boolean {
  if (objA === objB) {
    return true;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (objA[key] !== objB[key] || !Object.prototype.hasOwnProperty.call(objB, key)) {
      return false;
    }
  }

  return true;
}
