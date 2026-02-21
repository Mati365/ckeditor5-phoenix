import { describe, expect, it } from 'vitest';

import { createContextHtmlElement } from '~/test-utils/editor/create-context-html-element';

import { readContextConfigOrThrow } from './read-context-config-or-throw';

describe('readContextConfigOrThrow', () => {
  it('throws if attribute is missing', () => {
    const el = document.createElement('div');

    expect(() => readContextConfigOrThrow(el)).toThrow(
      'CKEditor5 hook requires a "data-cke-context" attribute on the element.',
    );
  });

  it('parses config and customTranslations (camelCase)', () => {
    const config: any = {
      config: { foo_bar: 1, nested_key: { bar_baz: 2 } },
      customTranslations: { hello: 'world' },
      watchdogConfig: { baz: 3 },
    };

    const el = createContextHtmlElement({ config });
    const result = readContextConfigOrThrow(el);

    expect(result.config).toEqual({ fooBar: 1, nestedKey: { barBaz: 2 } });
    expect(result.customTranslations).toEqual({ hello: 'world' });
    expect(result.watchdogConfig).toEqual({ baz: 3 });
  });

  it('parses config and custom_translations (snake_case)', () => {
    const config: any = {
      config: { foo_bar: 1, nested_key: { bar_baz: 2 } },
      custom_translations: { hello: 'świat' },
      watchdog_config: { baz: 4 },
    };

    const el = createContextHtmlElement({ config });
    const result = readContextConfigOrThrow(el);

    expect(result.config).toEqual({ fooBar: 1, nestedKey: { barBaz: 2 } });
    expect(result.customTranslations).toEqual({ hello: 'świat' });
    expect(result.watchdogConfig).toEqual({ baz: 4 });
  });

  it('returns undefined for missing customTranslations and watchdogConfig', () => {
    const config: any = { config: { foo: 1 } };
    const el = createContextHtmlElement({ config });
    const result = readContextConfigOrThrow(el);

    expect(result.config).toEqual({ foo: 1 });
    expect(result.customTranslations).toBeUndefined();
    expect(result.watchdogConfig).toBeUndefined();
  });
});
