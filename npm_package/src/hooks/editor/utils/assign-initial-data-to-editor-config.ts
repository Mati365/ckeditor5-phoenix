import type { EditorConfig } from 'ckeditor5';

/**
 * Assigns initial data to specified editor config.
 *
 * @param dataOrMap Initial data to be assigned to config.
 * @param config Config of the editor.
 * @returns The updated configuration object.
 */
export function assignInitialDataToEditorConfig<C extends EditorConfig>(
  dataOrMap: string | Record<string, string>,
  config: C,
): C {
  const dataMap = toDataMap(dataOrMap);
  const allRootsKeys = new Set([
    ...Object.keys(dataMap),
    ...Object.keys(config.roots ?? {}),
  ]);

  const rootsConfig = Array.from(allRootsKeys).reduce((acc, rootKey) => ({
    ...acc,
    [rootKey]: {
      ...config.roots?.[rootKey],
      ...rootKey === 'main' ? config.root : {},

      /* v8 ignore next 5 */
      ...rootKey in dataMap
        ? {
            initialData: dataMap[rootKey],
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

function toDataMap(element: string | Record<string, string>): Record<string, string> {
  return typeof element === 'string' ? { main: element } : { ...element };
}
