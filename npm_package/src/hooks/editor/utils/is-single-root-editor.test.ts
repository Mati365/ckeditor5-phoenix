import { describe, expect, it } from 'vitest';

import type { EditorType } from '../typings';

import { isSingleRootEditor } from './is-single-root-editor';

describe('isSingleRootEditor', () => {
  it('should return true for inline editor', () => {
    expect(isSingleRootEditor('inline')).toBe(true);
  });

  it('should return true for classic editor', () => {
    expect(isSingleRootEditor('classic')).toBe(true);
  });

  it('should return true for balloon editor', () => {
    expect(isSingleRootEditor('balloon')).toBe(true);
  });

  it('should return false for decoupled editor', () => {
    expect(isSingleRootEditor('decoupled')).toBe(true);
  });

  it('should return false for multiroot editor', () => {
    expect(isSingleRootEditor('multiroot')).toBe(false);
  });

  it('should handle all valid editor types', () => {
    const singleEditingTypes: EditorType[] = ['inline', 'classic', 'balloon', 'decoupled'];
    const multiEditingTypes: EditorType[] = ['multiroot'];

    singleEditingTypes.forEach((type) => {
      expect(isSingleRootEditor(type)).toBe(true);
    });

    multiEditingTypes.forEach((type) => {
      expect(isSingleRootEditor(type)).toBe(false);
    });
  });
});
