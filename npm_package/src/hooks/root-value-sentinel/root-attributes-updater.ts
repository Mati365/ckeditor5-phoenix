import type { Editor } from 'ckeditor5';

/**
 * Creates a function that synchronizes root attributes on the given editor root.
 *
 * The returned function tracks which attributes were set by itself and will only
 * remove attributes it previously managed. This avoids interfering with other
 * consumers that may also change attributes on the same root.
 *
 * @param editor The editor instance containing the root to manage.
 * @param rootName The name of the root to manage attributes on.
 * @returns A function that can be called with the desired set of attributes to apply them to the root.
 *          Calling the function with `null` or an empty object will clear all attributes previously set by it.
 */
export function createRootAttributesUpdater(editor: Editor, rootName: string): RootAttributesUpdater {
  const managedAttrs = new Set<string>();

  return (rootAttributes?: Record<string, unknown> | null) => {
    editor.model.enqueueChange({ isUndoable: false }, (writer) => {
      const root = editor.model.document.getRoot(rootName);

      /* v8 ignore next if -- @preserve */
      if (!root) {
        return;
      }

      // Remove previously managed attributes that are no longer requested.
      for (const key of managedAttrs) {
        if (rootAttributes && key in rootAttributes) {
          continue;
        }

        writer.removeAttribute(key, root);
        managedAttrs.delete(key);
      }

      // Apply or overwrite requested attributes.
      for (const [key, value] of Object.entries(rootAttributes ?? {})) {
        writer.setAttribute(key, value, root);
        managedAttrs.add(key);
      }
    });
  };
}

export type RootAttributesUpdater = (rootAttributes?: Record<string, unknown> | null) => void;
