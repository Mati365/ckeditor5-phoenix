import type { EditorCustomTranslationsDictionary, EditorPlugin } from '../editor';

/**
 * Configuration object for CKEditor5 context instance.
 */
export type ContextConfig = {
  /**
   * Optional custom translations for the editor.
   * This allows for localization of the editor interface.
   */
  customTranslations?: {
    dictionary: EditorCustomTranslationsDictionary;
  } | null;

  /**
   * Configuration options for the context instance.
   */
  config: ContextCreatorConfig;
};

/**
 * Configuration options for the context instance.
 */
export type ContextCreatorConfig = {
  /**
   * Array of plugin identifiers to be loaded by the editor.
   */
  plugins?: EditorPlugin[];

  /**
   * Other configuration options are flexible and can be any key-value pairs.
   */
  [key: string]: any;
};
