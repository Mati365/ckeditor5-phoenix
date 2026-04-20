import { describe, expect, it } from 'vitest';

import { areMapsEqual } from './are-maps-equal';

describe('areMapsEqual', () => {
  it('should return true for two empty maps', () => {
    expect(areMapsEqual(new Map(), new Map())).toBe(true);
  });

  it('should return true for maps with identical keys and primitive values', () => {
    const map1 = new Map([['a', 1], ['b', 2]]);
    const map2 = new Map([['a', 1], ['b', 2]]);

    expect(areMapsEqual(map1, map2)).toBe(true);
  });

  it('should return false if map sizes are different', () => {
    const map1 = new Map([['a', 1]]);
    const map2 = new Map([['a', 1], ['b', 2]]);

    expect(areMapsEqual(map1, map2)).toBe(false);
  });

  it('should return false if the keys are different', () => {
    const map1 = new Map([['a', 1], ['c', 2]]);
    const map2 = new Map([['a', 1], ['b', 2]]);

    expect(areMapsEqual(map1, map2)).toBe(false);
  });

  it('should return false if the values for the same keys are different', () => {
    const map1 = new Map([['a', 1], ['b', 3]]);
    const map2 = new Map([['a', 1], ['b', 2]]);

    expect(areMapsEqual(map1, map2)).toBe(false);
  });

  it('should return false if the first map (map1) is null', () => {
    const map2 = new Map([['a', 1]]);

    expect(areMapsEqual(null, map2)).toBe(false);
  });

  it('should correctly handle objects as values using shallow comparison (reference equality)', () => {
    const obj = { id: 1 };

    const map1 = new Map([['key', obj]]);
    const map2 = new Map([['key', obj]]);

    expect(areMapsEqual(map1, map2)).toBe(true);

    const map3 = new Map([['key', { id: 1 }]]);

    expect(areMapsEqual(map1, map3)).toBe(false);
  });
});
