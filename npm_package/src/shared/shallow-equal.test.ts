import { describe, expect, it } from 'vitest';

import { shallowEqual } from './shallow-equal';

describe('shallowEqual', () => {
  it('should return true for identical objects', () => {
    const obj = { a: 1, b: 2 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('should return true for objects with same primitive values', () => {
    const objA = { a: 1, b: 'test', c: true };
    const objB = { a: 1, b: 'test', c: true };
    expect(shallowEqual(objA, objB)).toBe(true);
  });

  it('should return false for objects with different values', () => {
    const objA = { a: 1, b: 2 };
    const objB = { a: 1, b: 3 };
    expect(shallowEqual(objA, objB)).toBe(false);
  });

  it('should return false for objects with different keys', () => {
    const objA = { a: 1, b: 2 };
    const objB = { a: 1, c: 2 } as any;
    expect(shallowEqual(objA, objB)).toBe(false);
  });

  it('should return false for objects with different number of keys', () => {
    const objA = { a: 1, b: 2 };
    const objB = { a: 1 };
    expect(shallowEqual(objA, objB)).toBe(false);
  });

  it('should return true for empty objects', () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  it('should return false for nested objects with same structure but different references', () => {
    const objA = { a: { nested: 1 } };
    const objB = { a: { nested: 1 } };
    expect(shallowEqual(objA, objB)).toBe(false);
  });

  it('should return true for nested objects with same reference', () => {
    const nested = { value: 1 };
    const objA = { a: nested };
    const objB = { a: nested };
    expect(shallowEqual(objA, objB)).toBe(true);
  });
});
