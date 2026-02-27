import type { Translations } from 'ckeditor5';

/**
 * Resolves translation references in a configuration object.
 *
 * The configuration may contain objects with the form `{ $translation: "some.key" }`.
 * These are replaced with the actual string from the provided translations map.
 *
 * The function will walk the provided object recursively, handling arrays and
 * nested objects. Primitive values are returned as-is. If a translation key is
 * not present in the map, a warning is logged and `null` is returned for that
 * value.
 *
 * @param translations - An array of CKEditor `Translations` objects. Each translation
 *                       pack will be searched in order for the requested key, and the
 *                       first matching value will be returned. This mirrors the format
 *                       returned by `loadAllEditorTranslations` and simplifies the
 *                       caller's API.
 * @param language - Language identifier to look up in the packs. Only this locale
 *                   will be consulted, ensuring that keys from other languages are
 *                   ignored even if they appear earlier in the array.
 * @param obj - Configuration object to process
 * @returns Processed configuration object with resolved translations.
 */
export function resolveEditorConfigTranslations<T>(
  translations: Translations[],
  language: string,
  obj: T,
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveEditorConfigTranslations(translations, language, item)) as T;
  }

  const anyObj = obj as any;

  if (anyObj.$translation && typeof anyObj.$translation === 'string') {
    const key: string = anyObj.$translation;
    const value = getTranslationValue(translations, key, language);

    if (value === undefined) {
      console.warn(`Translation not found for key: ${key}`);
    }

    return (value !== undefined ? value : null) as T;
  }

  const result = Object.create(null);

  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveEditorConfigTranslations(translations, language, value);
  }

  return result as T;
}

/**
 * Look up a translation value inside the provided map or array of CKEditor packs.
 */
function getTranslationValue(
  translations: Translations[],
  key: string,
  language: string,
): string | ReadonlyArray<string> | undefined {
  for (const pack of translations) {
    const langData = pack[language];

    if (langData?.dictionary && key in langData.dictionary) {
      return langData.dictionary[key] as string | ReadonlyArray<string>;
    }
  }

  return undefined;
}
