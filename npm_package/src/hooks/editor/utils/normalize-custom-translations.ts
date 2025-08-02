import type { Translations } from 'ckeditor5';

import { mapObjectValues } from 'src/shared';

import type { EditorCustomTranslationsDictionary } from '../typings';

/**
 * This function takes a custom translations object and maps it to the format expected by CKEditor5.
 * Each translation dictionary is wrapped in an object with a `dictionary` key.
 *
 * @param translations - The custom translations to normalize.
 * @returns A normalized translations object suitable for CKEditor5.
 */
export function normalizeCustomTranslations(translations: EditorCustomTranslationsDictionary): Translations {
  return mapObjectValues(translations, dictionary => ({
    dictionary,
  }));
}
