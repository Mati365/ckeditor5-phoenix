import type { EditorConfig } from 'ckeditor5';

import type { EditorRelaxedConstructor } from '../types/editor-relaxed-constructor.type';
import type { EditableItem } from './query-all-editor-editables';

/**
 * Assigns DOM elements and initial data to the editor configuration in a way that is compatible
 * with the specific editor type.
 *
 * @param Editor Constructor of the editor used to determine the location of element config entry.
 * @param editables Map of editable items (element + initial value) keyed by root name.
 * @param config Config of the editor.
 * @returns The updated configuration object.
 */
export function assignEditorRootsToConfig<C extends EditorConfig>(
  Editor: EditorRelaxedConstructor,
  editables: Record<string, EditableItem>,
  config: C,
): C {
  const isClassicEditor = !Editor.editorName || Editor.editorName === 'ClassicEditor';
  const allRootsKeys = new Set([
    ...Object.keys(editables),
    ...Object.keys(config.roots ?? {}),
  ]);

  const rootsConfig = Array.from(allRootsKeys).reduce((acc, rootKey) => ({
    ...acc,
    [rootKey]: {
      /* v8 ignore next 1 */
      ...config.roots?.[rootKey],
      ...rootKey === 'main' ? config.root : {},

      /* v8 ignore next 6 */
      ...rootKey in editables
        ? {
            initialData: editables[rootKey]!.initialValue,
            ...!isClassicEditor && { element: editables[rootKey]!.content },
          }
        : {},
    },
  }), { ...config.roots || {} });

  const mappedConfig: C = {
    ...config,
    roots: rootsConfig,
    ...isClassicEditor && {
      attachTo: editables['main']?.content,
    },
  };

  delete mappedConfig.root;

  return mappedConfig;
}
