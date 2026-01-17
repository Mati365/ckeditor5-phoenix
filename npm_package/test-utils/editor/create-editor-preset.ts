import type { EditorConfig, EditorType } from '../../src/hooks/editor/typings';

/**
 * Creates a preset configuration for testing purposes.
 */
export function createEditorPreset(
  type: EditorType = 'classic',
  config: Partial<EditorConfig> = {},
  customTranslations?: object,
) {
  const defaultConfig: EditorConfig = {
    plugins: ['Essentials', 'Paragraph', 'Bold', 'Italic', 'Undo', 'Image', 'ImageUpload'],
    toolbar: ['undo', 'redo', '|', 'bold', 'italic'],
  };

  return {
    type,
    config: { ...defaultConfig, ...config },
    license: { key: 'GPL' },
    ...customTranslations && {
      custom_translations: { dictionary: customTranslations },
    },
  };
}
