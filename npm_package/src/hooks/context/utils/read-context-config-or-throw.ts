import type { ContextConfig } from '../typings';

import { deepCamelCaseKeys } from '../../../shared/deep-camel-case-keys';

/**
 * Reads the hook configuration from the element's attribute and parses it as JSON.
 *
 * @param element - The HTML element that contains the hook configuration.
 * @returns The parsed hook configuration.
 */
export function readContextConfigOrThrow(element: HTMLElement): ContextConfig {
  const attributeValue = element.getAttribute('data-cke-context');

  if (!attributeValue) {
    throw new Error('CKEditor5 hook requires a "data-cke-context" attribute on the element.');
  }

  const { config, ...rest } = JSON.parse(attributeValue);

  return {
    config: deepCamelCaseKeys(config),
    customTranslations: rest.customTranslations || rest.custom_translations,
    watchdogConfig: rest.watchdogConfig || rest.watchdog_config,
  };
}
