import { describe, expect, it } from 'vitest';

import { readPresetOrThrow } from './read-preset-or-throw';

describe('readPresetOrThrow', () => {
  it('should parse valid preset configuration', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'classic',
      config: {
        plugins: ['Plugin1', 'Plugin2'],
        toolbar: ['bold', 'italic'],
      },
      license: {
        key: 'test-license-key',
      },
    };
    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    const result = readPresetOrThrow(element);

    expect(result).toEqual(preset);
  });

  it('should throw error when cke-preset attribute is missing', () => {
    const element = document.createElement('div');

    expect(() => readPresetOrThrow(element)).toThrow(
      'CKEditor5 hook requires a "cke-preset" attribute on the element.',
    );
  });

  it('should throw error when type is missing', () => {
    const element = document.createElement('div');
    const preset = {
      config: { plugins: [] },
      license: { key: 'test-key' },
    };
    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    expect(() => readPresetOrThrow(element)).toThrow(
      'CKEditor5 hook configuration must include "editor", "config", and "license" properties.',
    );
  });

  it('should throw error when config is missing', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'classic',
      license: { key: 'test-key' },
    };
    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    expect(() => readPresetOrThrow(element)).toThrow(
      'CKEditor5 hook configuration must include "editor", "config", and "license" properties.',
    );
  });

  it('should throw error when license is missing', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'classic',
      config: { plugins: [] },
    };
    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    expect(() => readPresetOrThrow(element)).toThrow(
      'CKEditor5 hook configuration must include "editor", "config", and "license" properties.',
    );
  });

  it('should throw error for invalid editor type', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'invalid-type',
      config: { plugins: [] },
      license: { key: 'test-key' },
    };
    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    expect(() => readPresetOrThrow(element)).toThrow(
      'Invalid editor type: invalid-type. Must be one of: inline, classic, balloon, decoupled, multiroot.',
    );
  });

  it('should handle all valid editor types', () => {
    const validTypes = [
      'inline',
      'classic',
      'balloon',
      'decoupled',
      'multiroot',
    ];

    validTypes.forEach((type) => {
      const element = document.createElement('div');
      const preset = {
        type,
        config: { plugins: [] },
        license: { key: 'test-key' },
      };
      element.setAttribute('data-cke-preset', JSON.stringify(preset));

      expect(() => readPresetOrThrow(element)).not.toThrow();
      const result = readPresetOrThrow(element);
      expect(result.type).toBe(type);
    });
  });

  it('should throw error for invalid JSON', () => {
    const element = document.createElement('div');
    element.setAttribute('data-cke-preset', 'invalid-json');

    expect(() => readPresetOrThrow(element)).toThrow();
  });

  it('should handle complex configuration objects', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'classic',
      config: {
        plugins: ['Plugin1', 'Plugin2'],
        toolbar: {
          items: ['bold', 'italic', 'link'],
          shouldNotGroupWhenFull: true,
        },
        image: {
          toolbar: ['imageStyle:full', 'imageStyle:side'],
        },
        customProperty: 'custom-value',
      },
      license: {
        key: 'complex-license-key',
      },
    };

    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    const result = readPresetOrThrow(element);

    expect(result).toEqual(preset);
    expect(result.config['toolbar']['items']).toEqual([
      'bold',
      'italic',
      'link',
    ]);

    expect(result.config['customProperty']).toBe('custom-value');
  });

  it('should support camelCase keys in config and customTranslations', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'classic',
      config: {
        customProperty: 'value1',
        nestedObject: {
          innerProperty: 'innerValue1',
        },
      },
      license: { key: 'test-key' },
      customTranslations: { foo: 'bar' },
    };

    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    const result = readPresetOrThrow(element);

    expect(result.config['customProperty']).toBe('value1');
    expect(result.config['nestedObject']['innerProperty']).toBe('innerValue1');
    expect(result.customTranslations).toEqual({ foo: 'bar' });
  });

  it('should support snake_case keys in config and custom_translations', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'classic',
      config: {
        custom_property: 'value2',
        nested_object: {
          inner_property: 'innerValue2',
        },
      },
      license: { key: 'test-key' },
      custom_translations: { bar: 'baz' },
    };

    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    const result = readPresetOrThrow(element);

    expect(result.config['customProperty']).toBe('value2');
    expect(result.config['nestedObject']['innerProperty']).toBe('innerValue2');
    expect(result.customTranslations).toEqual({ bar: 'baz' });
  });

  it('should handle empty attribute gracefully', () => {
    const element = document.createElement('div');

    element.setAttribute('data-cke-preset', '');

    expect(() => readPresetOrThrow(element)).toThrow(
      'CKEditor5 hook requires a "cke-preset" attribute on the element.',
    );
  });

  it('should handle null values in configuration', () => {
    const element = document.createElement('div');
    const preset = {
      type: 'classic',
      config: null,
      license: { key: 'test-key' },
    };

    element.setAttribute('data-cke-preset', JSON.stringify(preset));

    expect(() => readPresetOrThrow(element)).toThrow(
      'CKEditor5 hook configuration must include "editor", "config", and "license" properties.',
    );
  });
});
