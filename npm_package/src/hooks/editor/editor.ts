import type { Editor } from 'ckeditor5';

import type { EditorId } from './typings';
import type { EditorCreator } from './utils';

import { isEmptyObject, parseIntIfNotNull, waitFor } from '../../shared';
import { ClassHook, makeHook } from '../../shared/hook';
import { ContextsRegistry, getNearestContextParentPromise } from '../context';
import { EditorsRegistry } from './editors-registry';
import {
  createPhoenixUploadAdapterPlugin,
  createSyncEditorWithInputPlugin,
  createSyncEditorWithPhoenixPlugin,
} from './plugins';
import {
  createEditorInContext,
  isSingleRootEditor,
  loadAllEditorTranslations,
  loadEditorConstructor,
  loadEditorPlugins,
  normalizeCustomTranslations,
  queryEditablesElements,
  queryEditablesSnapshotContent,
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

    if (isSingleRootEditor(type)) {
      loadedPlugins.push(
        await createSyncEditorWithInputPlugin({
          editorId,
          saveDebounceMs,
        }),
      );
    }

    loadedPlugins.push(
      ...await Promise.all([
        createSyncEditorWithPhoenixPlugin({
          editorId,
          saveDebounceMs,
          events,
          pushEvent: this.pushEvent.bind(this),
          handleEvent: this.handleEvent.bind(this),
        }),
        createPhoenixUploadAdapterPlugin(),
      ]),
    );

    // Mix custom translations with loaded translations.
    const loadedTranslations = await loadAllEditorTranslations(language, hasPremium);
    const mixedTranslations = [
      ...loadedTranslations,
      normalizeCustomTranslations(customTranslations?.dictionary || {}),
    ]
      .filter(translations => !isEmptyObject(translations));

    // Let's query all elements, and create basic configuration.
    let initialData: string | Record<string, string> = queryEditablesSnapshotContent(editorId);

    if (isSingleRootEditor(type)) {
      initialData = initialData['main'] || '';
    }

    // Depending of the editor type, and parent lookup for nearest context or initialize it without it.
    const editor = await (async () => {
      let sourceElements: HTMLElement | Record<string, HTMLElement> = queryEditablesElements(editorId);

      // Handle special case when user specified `initialData` of several root elements, but editable components
      // are not yet present in the DOM. In other words - editor is initialized before attaching root elements.
      if (!(sourceElements instanceof HTMLElement) && !('main' in sourceElements)) {
        const requiredRoots = (
          type === 'decoupled'
            ? ['main']
            : Object.keys(initialData as Record<string, string>)
        );

        if (!checkIfAllRootsArePresent(sourceElements, requiredRoots)) {
          sourceElements = await waitForAllRootsToBePresent(editorId, requiredRoots);
          initialData = queryEditablesSnapshotContent(editorId);
        }
      }

      // If single root editor, unwrap the element from the object.
      if (isSingleRootEditor(type) && 'main' in sourceElements) {
        sourceElements = sourceElements['main'];
      }

      const parsedConfig = {
        ...resolveEditorConfigElementReferences(config),
        initialData,
        licenseKey: license.key,
        plugins: loadedPlugins,
        language,
        ...mixedTranslations.length && {
          translations: mixedTranslations,
        },
      };

      if (!context || !(sourceElements instanceof HTMLElement)) {
        return Constructor.create(sourceElements as any, parsedConfig);
      }

      const result = await createEditorInContext({
        context,
        element: sourceElements,
        creator: Constructor,
        config: parsedConfig,
      });

      return result.editor;
    })();

    if (isSingleRootEditor(type) && editableHeight) {
      setEditorEditableHeight(editor, editableHeight);
    }

    return editor;
  };
}

/**
 * Checks if all required root elements are present in the elements object.
 *
 * @param elements The elements object mapping root IDs to HTMLElements.
 * @param requiredRoots The list of required root IDs.
 * @returns True if all required roots are present, false otherwise.
 */
function checkIfAllRootsArePresent(elements: Record<string, HTMLElement>, requiredRoots: string[]): boolean {
  return requiredRoots.every(rootId => elements[rootId]);
}

/**
 * Waits for all required root elements to be present in the DOM.
 *
 * @param editorId The editor's ID.
 * @param requiredRoots The list of required root IDs.
 * @returns A promise that resolves to the record of root elements.
 */
async function waitForAllRootsToBePresent(
  editorId: EditorId,
  requiredRoots: string[],
): Promise<Record<string, HTMLElement>> {
  return waitFor(
    () => {
      const elements = queryEditablesElements(editorId) as unknown as Record<string, HTMLElement>;

      if (!checkIfAllRootsArePresent(elements, requiredRoots)) {
        throw new Error(
          'It looks like not all required root elements are present yet.\n'
          + '* If you want to wait for them, ensure they are registered before editor initialization.\n'
          + '* If you want lazy initialize roots, consider removing root values from the `initialData` config '
          + 'and assign initial data in editable components.\n'
          + `Missing roots: ${requiredRoots.filter(rootId => !elements[rootId]).join(', ')}.`,
        );
      }

      return elements;
    },
    { timeOutAfter: 2000, retryAfter: 100 },
  );
}

/**
 * Phoenix LiveView hook for CKEditor 5.
 */
export const EditorHook = makeHook(EditorHookImpl);
