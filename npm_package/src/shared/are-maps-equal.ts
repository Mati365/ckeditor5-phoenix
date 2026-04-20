/**
 * Compares two Map structures for equality based on their contents.
 * The function checks if the maps have the same size, contain the exact same keys,
 * and have strictly equal values (using shallow comparison).
 *
 * @param map1 - The first map to compare (can be null).
 * @param map2 - The second map to compare.
 * @returns Returns `true` if the maps are identical in terms of keys and values, otherwise `false`.
 */
export function areMapsEqual(map1: Map<any, any> | null, map2: Map<any, any>): boolean {
  if (!map1 || map1.size !== map2.size) {
    return false;
  }

  for (const [key, value] of map1) {
    if (!map2.has(key) || map2.get(key) !== value) {
      return false;
    }
  }

  return true;
}
