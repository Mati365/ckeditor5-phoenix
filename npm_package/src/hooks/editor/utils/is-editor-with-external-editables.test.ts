import { describe, expect, it } from 'vitest';

import { isEditorWithExternalEditables } from './is-editor-with-external-editables';

describe('isEditorWithExternalEditables', () => {
  it('should return false for inline editor', () => {
    expect(isEditorWithExternalEditables('inline')).toBe(false);
  });

  it('should return false for classic editor', () => {
    expect(isEditorWithExternalEditables('classic')).toBe(false);
  });

  it('should return false for balloon editor', () => {
    expect(isEditorWithExternalEditables('balloon')).toBe(false);
  });

  it('should return true for decoupled editor', () => {
    expect(isEditorWithExternalEditables('decoupled')).toBe(true);
  });

  it('should return true for multiroot editor', () => {
    expect(isEditorWithExternalEditables('multiroot')).toBe(true);
  });
});
