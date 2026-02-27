import type { Translations } from 'ckeditor5';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveEditorConfigTranslations } from './resolve-editor-config-translations';

describe('resolveEditorConfigTranslations', () => {
  let translationsPacks: Translations[];

  beforeEach(() => {
    translationsPacks = [
      makePack('en', {
        HELLO: 'Hello world',
        NESTED: 'nested value',
        ARRAY: 'array value',
      }),
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a single translation reference', () => {
    const config = {
      foo: { $translation: 'HELLO' },
    };

    const result = resolveEditorConfigTranslations(translationsPacks, 'en', config);
    expect(result.foo).toBe('Hello world');
  });

  it('respects specified language when multiple packs present', () => {
    const packs: Translations[] = [
      makePack('en', { KEY: 'english' }),
      makePack('pl', { KEY: 'polish' }),
    ];

    const result = resolveEditorConfigTranslations(packs, 'pl', { foo: { $translation: 'KEY' } });
    expect(result.foo).toBe('polish');
  });

  it('returns null if translation key not found', () => {
    const config = {
      foo: { $translation: 'MISSING' },
    };

    const result = resolveEditorConfigTranslations(translationsPacks, 'en', config);
    expect(result.foo).toBeNull();
  });

  it('recursively resolves nested translation references', () => {
    const config = {
      nested: {
        bar: { $translation: 'NESTED' },
      },
    };

    const result = resolveEditorConfigTranslations(translationsPacks, 'en', config);
    expect(result.nested.bar).toBe('nested value');
  });

  it('resolves translation references in arrays', () => {
    const config = [
      { $translation: 'HELLO' },
      { $translation: 'ARRAY' },
      { notTranslation: 123 },
    ];

    const result = resolveEditorConfigTranslations(translationsPacks, 'en', config);

    expect(result[0]).toBe('Hello world');
    expect(result[1]).toBe('array value');
    expect(result[2]).toEqual({ notTranslation: 123 });
  });

  it('returns primitives as is', () => {
    expect(resolveEditorConfigTranslations(translationsPacks, 'en', 42 as any)).toBe(42);
    expect(resolveEditorConfigTranslations(translationsPacks, 'en', 'foo' as any)).toBe('foo');
    expect(resolveEditorConfigTranslations(translationsPacks, 'en', null as any)).toBe(null);
    expect(resolveEditorConfigTranslations(translationsPacks, 'en', undefined as any)).toBe(undefined);
  });

  it('warns for missing translation key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = { foo: { $translation: 'UNKNOWN' } };

    resolveEditorConfigTranslations(translationsPacks, 'en', config);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Translation not found for key: UNKNOWN'));
  });

  it('selects translations based on the provided language when multiple packs are given', () => {
    const packs: Translations[] = [
      makePack('en', { HELLO: 'Hello world', ARRAY: 'array value' }),
      makePack('pl', { NESTED: 'nested value' }),
    ];

    const config = {
      foo: { $translation: 'HELLO' },
      nested: { bar: { $translation: 'NESTED' } },
      arr: [{ $translation: 'ARRAY' }],
      missing: { $translation: 'NOTHING' },
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const resultEn = resolveEditorConfigTranslations(packs, 'en', config);

    expect(resultEn.foo).toBe('Hello world');
    expect(resultEn.nested.bar).toBeNull();
    expect(resultEn.arr[0]).toBe('array value');
    expect(resultEn.missing).toBeNull();

    const resultPl = resolveEditorConfigTranslations(packs, 'pl', config);

    expect(resultPl.foo).toBeNull();
    expect(resultPl.nested.bar).toBe('nested value');
    expect(resultPl.arr[0]).toBeNull();
    expect(resultPl.missing).toBeNull();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Translation not found for key: NOTHING'));
  });
});

function makePack(lang: string, dict: Record<string, string>): Translations {
  return {
    [lang]: {
      dictionary: dict,
      getPluralForm: null,
    },
  };
}
