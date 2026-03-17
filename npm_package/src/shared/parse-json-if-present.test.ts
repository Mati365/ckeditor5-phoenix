import { describe, expect, it } from 'vitest';

import { parseJsonIfPresent } from './parse-json-if-present';

describe('parseJsonIfPresent', () => {
  it('should return null when the input is null', () => {
    expect(parseJsonIfPresent(null)).toBeNull();
  });

  it('should return null when the input is undefined', () => {
    expect(parseJsonIfPresent(undefined)).toBeNull();
  });

  it('should return null when the input is an empty string', () => {
    expect(parseJsonIfPresent('')).toBeNull();
  });

  it('should parse valid JSON', () => {
    expect(parseJsonIfPresent('{"foo": "bar"}')).toEqual({ foo: 'bar' });
  });

  it('should throw when the input is invalid JSON', () => {
    expect(() => parseJsonIfPresent('{foo: bar}')).toThrow(SyntaxError);
  });
});
