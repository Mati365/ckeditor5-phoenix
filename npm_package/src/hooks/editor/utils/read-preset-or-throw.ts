import type { EditorPreset } from '../typings';

import { deepCamelCaseKeys } from '../../../shared/deep-camel-case-keys';
import { EDITOR_TYPES } from '../typings';

/**
 * Reads the hook configuration from the element's attribute and parses it as JSON.
 *
 * @param element - The HTML element that contains the hook configuration.
 * @returns The parsed hook configuration.
 */
export function readPresetOrThrow(element: HTMLElement): EditorPreset {
  const attributeValue = element.getAttribute('data-cke-preset');

  if (!attributeValue) {
    throw new Error('CKEditor5 hook requires a "cke-preset" attribute on the element.');
  }

  const { type, config, license, ...rest } = JSON.parse(attributeValue);

  if (!type || !config || !license) {
    throw new Error('CKEditor5 hook configuration must include "editor", "config", and "license" properties.');
  }

  if (!EDITOR_TYPES.includes(type)) {
    throw new Error(`Invalid editor type: ${type}. Must be one of: ${EDITOR_TYPES.join(', ')}.`);
  }

  return {
    type,
    license,
    config: deepCamelCaseKeys(config),
    customTranslations: rest.customTranslations || rest.custom_translations,
  };
}
