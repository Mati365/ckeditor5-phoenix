import type { EditorConfig } from 'ckeditor5';

import type { EditorRelaxedConstructor } from '../types/editor-relaxed-constructor.type';

/**
 * Assigns a DOM element to the editor configuration in a way that is compatible with the specific editor type.
 *
 * @param Editor Constructor of the editor used to determine the location of element config entry.
 * @param elementOrMap Element to be assigned to config.
 * @param config Config of the editor.
 * @returns The updated configuration object.
 */
export function assignSourceElementsToEditorConfig<C extends EditorConfig>(
  Editor: EditorRelaxedConstructor,
  elementOrMap: HTMLElement | Record<string, HTMLElement>,
  config: C,
): C {
  const elementsMap = toElementsMap(elementOrMap);

  if (!Editor.editorName || Editor.editorName === 'ClassicEditor') {
    return {
      ...config,
      attachTo: elementsMap['main'],
    };
  }

  const allRootsKeys = new Set([
    ...Object.keys(elementsMap),
    ...Object.keys(config.roots ?? {}),
  ]);

  const rootsConfig = Array.from(allRootsKeys).reduce((acc, rootKey) => ({
    ...acc,
    [rootKey]: {
      /* v8 ignore next */
      ...config.roots?.[rootKey],
      ...rootKey === 'main' ? config.root : {},

      /* v8 ignore next 5 */
      ...rootKey in elementsMap
        ? {
            element: elementsMap[rootKey],
          }
        : {},
    },
  }), Object.create(config.roots || {}));

  const mappedConfig: C = {
    ...config,
    roots: rootsConfig,
  };

  delete mappedConfig.root;

  return mappedConfig;
}

function toElementsMap(element: HTMLElement | Record<string, HTMLElement>): Record<string, HTMLElement> {
  return element instanceof HTMLElement ? { main: element } : { ...element };
}
