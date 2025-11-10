import type { PluginConstructor } from 'ckeditor5';

import type { EditorPlugin } from '../typings';

import { CustomEditorPluginsRegistry } from '../custom-editor-plugins';

/**
 * Loads CKEditor plugins from base and premium packages.
 * First tries to load from the base 'ckeditor5' package, then falls back to 'ckeditor5-premium-features'.
 *
 * @param plugins - Array of plugin names to load
 * @returns Promise that resolves to an array of loaded Plugin instances
 * @throws Error if a plugin is not found in either package
 */
export async function loadEditorPlugins(plugins: EditorPlugin[]): Promise<LoadedPlugins> {
  const basePackage = await import('ckeditor5');
  let premiumPackage: Record<string, any> | null = null;

  const loaders = plugins.map(async (plugin) => {
    // Let's first try to load the plugin from the base package.
    // Coverage is disabled due to Vitest issues with mocking dynamic imports.

    // Try custom plugins before checking packages.
    const customPlugin = await CustomEditorPluginsRegistry.the.get(plugin);

    if (customPlugin) {
      return customPlugin;
    }

    // If not found, try to load from the base package.
    const { [plugin]: basePkgImport } = basePackage as Record<string, unknown>;

    if (basePkgImport) {
      return basePkgImport as PluginConstructor;
    }

    // Plugin not found in base package, try premium package.
    if (!premiumPackage) {
      try {
        premiumPackage = await import('ckeditor5-premium-features');
        /* v8 ignore next 6 */
      }
      catch (error) {
        console.error(`Failed to load premium package: ${error}`);
      }
    }

    /* v8 ignore next */
    const { [plugin]: premiumPkgImport } = premiumPackage || {};

    if (premiumPkgImport) {
      return premiumPkgImport as PluginConstructor;
    }

    // Plugin not found in either package, throw an error.
    throw new Error(`Plugin "${plugin}" not found in base or premium packages.`);
  });

  return {
    loadedPlugins: await Promise.all(loaders),
    hasPremium: !!premiumPackage,
  };
}

/**
 * Type representing the loaded plugins and whether premium features are available.
 */
type LoadedPlugins = {
  loadedPlugins: PluginConstructor<any>[];
  hasPremium: boolean;
};
