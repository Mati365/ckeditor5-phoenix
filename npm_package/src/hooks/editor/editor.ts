import type { Editor } from 'ckeditor5';

import type { EditorId, EditorType } from './typings';
import type { EditorCreator } from './utils';

import {
  isEmptyObject,
  mapObjectValues,
  parseIntIfNotNull,
} from '../../shared';
import { ClassHook, makeHook } from '../../shared/hook';
import { ContextsRegistry, getNearestContextParentPromise } from '../context';
import { EditorsRegistry } from './editors-registry';
import { createSyncEditorWithInputPlugin, createSyncEditorWithPhoenixPlugin } from './plugins';
import {
  createEditorInContext,
  isSingleEditingLikeEditor,
  loadAllEditorTranslations,
  loadEditorConstructor,
  loadEditorPlugins,
  normalizeCustomTranslations,
  queryAllEditorEditables,
  readPresetOrThrow,
  resolveEditorConfigElementReferences,
  setEditorEditableHeight,
  unwrapEditorContext,
  unwrapEditorWatchdog,
  wrapWithWatchdog,
} from './utils';

/**
 * Editor hook for Phoenix LiveView.
 *
 * This class is a hook that can be used with Phoenix LiveView to integrate
 * the CKEditor 5 WYSIWYG editor.
 */
class EditorHookImpl extends ClassHook {
  /**
   * The promise that resolves to the editor instance.
   */
  private editorPromise: Promise<Editor> | null = null;

  /**
   * Attributes for the editor instance.
   */
  private get attrs() {
    const { el } = this;
    const get = el.getAttribute.bind(el);
    const has = el.hasAttribute.bind(el);

    const value = {
      editorId: get('id')!,
      contextId: get('cke-context-id'),
      preset: readPresetOrThrow(el),
      editableHeight: parseIntIfNotNull(get('cke-editable-height')),
      watchdog: has('cke-watchdog'),
      events: {
        change: has('cke-change-event'),
        blur: has('cke-blur-event'),
        focus: has('cke-focus-event'),
      },
      saveDebounceMs: parseIntIfNotNull(get('cke-save-debounce-ms')) ?? 400,
      language: {
        ui: get('cke-language') || 'en',
        content: get('cke-content-language') || 'en',
      },
    };

    Object.defineProperty(this, 'attrs', {
      value,
      writable: false,
      configurable: false,
      enumerable: true,
    });

    return value;
  }

  /**
   * Mounts the editor component.
   */
  override async mounted() {
    const { editorId } = this.attrs;

    EditorsRegistry.the.resetErrors(editorId);

    try {
      this.editorPromise = this.createEditor();

      const editor = await this.editorPromise;

      // Do not even try to broadcast about the registration of the editor
      // if hook was immediately destroyed.
      if (!this.isBeingDestroyed()) {
        EditorsRegistry.the.register(editorId, editor);

        editor.once('destroy', () => {
          if (EditorsRegistry.the.hasItem(editorId)) {
            EditorsRegistry.the.unregister(editorId);
          }
        });
      }
    }
    catch (error: any) {
      this.editorPromise = null;
      EditorsRegistry.the.error(editorId, error);
    }

    return this;
  }

  /**
   * Destroys the editor instance when the component is destroyed.
   * This is important to prevent memory leaks and ensure that the editor is properly cleaned up.
   */
  override async destroyed() {
    // Let's hide the element during destruction to prevent flickering.
    this.el.style.display = 'none';

    // Let's wait for the mounted promise to resolve before proceeding with destruction.
    try {
      const editor = await this.editorPromise;

      if (!editor) {
        return;
      }

      const editorContext = unwrapEditorContext(editor);
      const watchdog = unwrapEditorWatchdog(editor);

      if (editorContext) {
        // If context is present, make sure it's not in unmounting phase, as it'll kill the editors.
        // If it's being destroyed, don't do anything, as the context will take care of it.
        if (editorContext.state !== 'unavailable') {
          await editorContext.context.remove(editorContext.editorContextId);
        }
      }
      else if (watchdog) {
        await watchdog.destroy();
      }
      else {
        await editor.destroy();
      }
    }
    finally {
      this.editorPromise = null;
    }
  }

  /**
   * Creates the CKEditor instance.
   */
  private async createEditor() {
    const { preset, editorId, contextId, editableHeight, events, saveDebounceMs, language, watchdog } = this.attrs;
    const { customTranslations, type, license, config: { plugins, ...config } } = preset;

    // Wrap editor creator with watchdog if needed.
    let Constructor: EditorCreator = await loadEditorConstructor(type);
    const context = await (
      contextId
        ? ContextsRegistry.the.waitFor(contextId)
        : getNearestContextParentPromise(this.el)
    );

    // Do not use editor specific watchdog if context is attached, as the context is by default protected.
    if (watchdog && !context) {
      const wrapped = await wrapWithWatchdog(Constructor);

      ({ Constructor } = wrapped);
      wrapped.watchdog.on('restart', () => {
        const newInstance = wrapped.watchdog.editor!;

        this.editorPromise = Promise.resolve(newInstance);

        EditorsRegistry.the.register(editorId, newInstance);
      });
    }

    const { loadedPlugins, hasPremium } = await loadEditorPlugins(plugins);

    if (isSingleEditingLikeEditor(type)) {
      loadedPlugins.push(
        await createSyncEditorWithInputPlugin({
          editorId,
          saveDebounceMs,
        }),
      );
    }

    loadedPlugins.push(
      await createSyncEditorWithPhoenixPlugin({
        editorId,
        saveDebounceMs,
        events,
        pushEvent: this.pushEvent.bind(this),
        handleEvent: this.handleEvent.bind(this),
      }),
    );

    // Mix custom translations with loaded translations.
    const loadedTranslations = await loadAllEditorTranslations(language, hasPremium);
    const mixedTranslations = [
      ...loadedTranslations,
      normalizeCustomTranslations(customTranslations?.dictionary || {}),
    ]
      .filter(translations => !isEmptyObject(translations));

    // Let's query all elements, and create basic configuration.
    const sourceElementOrData = getInitialRootsContentElements(editorId, type);
    const parsedConfig = {
      ...resolveEditorConfigElementReferences(config),
      initialData: getInitialRootsValues(editorId, type),
      licenseKey: license.key,
      plugins: loadedPlugins,
      language,
      ...mixedTranslations.length && {
        translations: mixedTranslations,
      },
    };

    // Depending of the editor type, and parent lookup for nearest context or initialize it without it.
    const editor = await (async () => {
      if (!context || !(sourceElementOrData instanceof HTMLElement)) {
        return Constructor.create(sourceElementOrData as any, parsedConfig);
      }

      const result = await createEditorInContext({
        context,
        element: sourceElementOrData,
        creator: Constructor,
        config: parsedConfig,
      });

      return result.editor;
    })();

    if (isSingleEditingLikeEditor(type) && editableHeight) {
      setEditorEditableHeight(editor, editableHeight);
    }

    return editor;
  };
}

/**
 * Gets the initial root elements for the editor based on its type.
 *
 * @param editorId The editor's ID.
 * @param type The type of the editor.
 * @returns The root element(s) for the editor.
 */
function getInitialRootsContentElements(editorId: EditorId, type: EditorType) {
  // While the `decoupled` editor is a single editing-like editor, it has a different structure
  // and requires special handling to get the main editable.
  if (type === 'decoupled') {
    const { content } = queryDecoupledMainEditableOrThrow(editorId);

    return content;
  }

  if (isSingleEditingLikeEditor(type)) {
    return document.getElementById(`${editorId}_editor`)!;
  }

  const editables = queryAllEditorEditables(editorId);

  return mapObjectValues(editables, ({ content }) => content);
}

/**
 * Gets the initial data for the roots of the editor. If the editor is a single editing-like editor,
 * it retrieves the initial value from the element's attribute. Otherwise, it returns an object mapping
 * editable names to their initial values.
 *
 * @param editorId The editor's ID.
 * @param type The type of the editor.
 * @returns The initial values for the editor's roots.
 */
function getInitialRootsValues(editorId: EditorId, type: EditorType) {
  // While the `decoupled` editor is a single editing-like editor, it has a different structure
  // and requires special handling to get the main editable.
  if (type === 'decoupled') {
    const { initialValue } = queryDecoupledMainEditableOrThrow(editorId);

    // If initial value is not set, then pick it from the editor element.
    if (initialValue) {
      return initialValue;
    }
  }

  // Let's check initial value assigned to the editor element.
  if (isSingleEditingLikeEditor(type)) {
    const initialValue = document.getElementById(editorId)?.getAttribute('cke-initial-value') || '';

    return initialValue;
  }

  const editables = queryAllEditorEditables(editorId);

  return mapObjectValues(editables, ({ initialValue }) => initialValue);
}

/**
 * Queries the main editable for a decoupled editor and throws an error if not found.
 *
 * @param editorId The ID of the editor to query.
 */
function queryDecoupledMainEditableOrThrow(editorId: EditorId) {
  const mainEditable = queryAllEditorEditables(editorId)['main'];

  if (!mainEditable) {
    throw new Error(`No "main" editable found for editor with ID "${editorId}".`);
  }

  return mainEditable;
}

/**
 * Phoenix LiveView hook for CKEditor 5.
 */
export const EditorHook = makeHook(EditorHookImpl);
