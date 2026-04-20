import type { EditorId } from './typings';

import { isEmptyObject, parseIntIfNotNull, waitFor } from '../../shared';
import { ClassHook, makeHook } from '../../shared/hook';
import { ContextsRegistry, getNearestContextParentPromise } from '../context';
import { RootValueSentinel } from '../root-value-sentinel';
import { EditorsRegistry } from './editors-registry';
import {
  createPhoenixUploadAdapterPlugin,
  createSyncEditorWithInputPlugin,
  createSyncEditorWithPhoenixPlugin,
} from './plugins';
import {
  cleanupOrphanEditorElements,
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
  resolveEditorConfigTranslations,
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
   * The sentinel instance responsible for tracking and updating root values and attributes
   * for single-root editors.
   */
  private sentinel: RootValueSentinel | null = null;

  /**
   * Attributes for the editor instance.
   */
  private get attrs() {
    const { el } = this;
    const get = el.getAttribute.bind(el);
    const has = el.hasAttribute.bind(el);

    const value = {
      editorId: get('id')!,
      contextId: get('data-cke-context-id'),
      preset: readPresetOrThrow(el),
      editableHeight: parseIntIfNotNull(get('data-cke-editable-height')),
      watchdog: has('data-cke-watchdog'),
      events: {
        change: has('data-cke-change-event'),
        blur: has('data-cke-blur-event'),
        focus: has('data-cke-focus-event'),
        ready: has('data-cke-ready-event'),
      },
      saveDebounceMs: parseIntIfNotNull(get('data-cke-save-debounce-ms')) ?? 400,
      language: {
        ui: get('data-cke-language') || 'en',
        content: get('data-cke-content-language') || 'en',
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
      // Run stuff that have to be initialized once, even if editor might restart.
      const editor = await this.createEditor();

      // Do not even try to broadcast about the registration of the editor if hook was immediately destroyed.
      /* v8 ignore next 3 */
      if (this.isBeingDestroyed()) {
        return;
      }

      // Run some stuff that have to be reinitialized every-time editor is being restarted.
      const unmountEffect = EditorsRegistry.the.mountEffect(editorId, (editor) => {
        // Enforce deregistration of the editor when it's being destroyed by watchdog.
        editor.once('destroy', () => {
          // Let's handle case when watchdog (or context watchdog) destroyed editor "externally"
          // user might also manually kill the editor using `.destroy()` method.
          // Keep pending callbacks though. Someone might register new callbacks just before calling `.destroy()`.
          EditorsRegistry.the.unregister(editorId, false);
        }, { priority: 'highest' });

        this.sentinel = new RootValueSentinel({
          editor,
          el: this.el,
          rootName: 'main',
          valueAttrName: 'data-cke-initial-value',
          rootAttrsAttrName: 'data-cke-root-attrs',
        });

        return () => {
          this.sentinel?.destroy();
          this.sentinel = null;
        };
      });

      this.onBeforeDestroy(unmountEffect);
      EditorsRegistry.the.register(editorId, editor);
    }
    catch (error: any) {
      console.error(error);
      EditorsRegistry.the.error(editorId, error);
    }

    return this;
  }

  /**
   * Watch attributes changes and sync value if something changed.
   */
  override async updated() {
    this.sentinel?.updated();
  }

  /**
   * Destroys the editor instance when the component is destroyed.
   * This is important to prevent memory leaks and ensure that the editor is properly cleaned up.
   */
  override async destroyed() {
    const { editorId } = this.attrs;

    // Let's hide the element during destruction to prevent flickering.
    this.el.style.display = 'none';

    // Let's wait for the mounted promise to resolve before proceeding with destruction.
    const editor = await EditorsRegistry.the.waitFor(editorId);

    /* v8 ignore next 3 */
    if (!editor) {
      return;
    }

    EditorsRegistry.the.unregister(editorId);

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

  /**
   * Creates the CKEditor instance.
   */
  private async createEditor() {
    const {
      preset,
      editorId,
      contextId,
      editableHeight,
      events,
      saveDebounceMs,
      language,
      watchdog: useWatchdog,
    } = this.attrs;

    const { customTranslations, type, license, config: { plugins, ...config } } = preset;

    const Constructor = await loadEditorConstructor(type);
    const context = await (
      contextId
        ? ContextsRegistry.the.waitFor(contextId)
        : getNearestContextParentPromise(this.el)
    );

    /**
     * Builds the full editor configuration and creates the editor instance.
     */
    const buildAndCreateEditor = async () => {
      const { loadedPlugins, hasPremium } = await loadEditorPlugins(plugins);

      // Sync `main` root (usually in single root editors) with hidden input.
      if (isSingleRootEditor(type)) {
        loadedPlugins.push(
          await createSyncEditorWithInputPlugin({
            editorId,
            saveDebounceMs,
          }),
        );
      }

      // Add phoenix integration plugins.
      loadedPlugins.push(
        ...await Promise.all([
          createSyncEditorWithPhoenixPlugin(
            {
              editorId,
              saveDebounceMs,
              events,
              pushEvent: this.pushEvent.bind(this),
              handleEvent: this.handleEvent.bind(this),
            },
          ),
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

      // Construct parsed config. First resolve DOM element references in the provided configuration.
      let resolvedConfig = resolveEditorConfigElementReferences(config);

      // Then resolve translation references in the provided configuration, using the mixed translations.
      resolvedConfig = resolveEditorConfigTranslations([...mixedTranslations].reverse(), language.ui, resolvedConfig);

      const parsedConfig = {
        ...resolvedConfig,
        initialData,
        licenseKey: license.key,
        plugins: loadedPlugins,
        language,
        ...mixedTranslations.length && {
          translations: mixedTranslations,
        },
      };

      const editor = await (async () => {
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

    // Do not use editor specific watchdog if context is attached, as the context is by default protected.
    if (useWatchdog && !context) {
      const watchdog = await wrapWithWatchdog(buildAndCreateEditor, preset.watchdog);

      // Cleanup editor registry before restart of the editor (restart might fail too).
      watchdog.on('error', (_, { causesRestart }) => {
        if (causesRestart) {
          const prevEditor = EditorsRegistry.the.getItem(editorId);

          /* v8 ignore next 3 */
          if (prevEditor) {
            cleanupOrphanEditorElements(prevEditor);

            EditorsRegistry.the.unregister(editorId);
          }
        }
      });

      // Register new instance after editor restarted.
      watchdog.on('restart', () => {
        const newInstance = watchdog.editor!;

        EditorsRegistry.the.register(editorId, newInstance);
      });

      // Start the watchdog — internally calls buildAndCreateEditor via setCreator.
      await watchdog.create({});

      return watchdog.editor!;
    }

    return buildAndCreateEditor();
  }
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
