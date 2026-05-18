import type { EditorId } from './typings';
import type { EditableItem } from './utils';

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
  assignEditorRootsToConfig,
  cleanupOrphanEditorElements,
  createEditorInContext,
  isSingleRootEditor,
  loadAllEditorTranslations,
  loadEditorConstructor,
  loadEditorPlugins,
  normalizeCustomTranslations,
  queryAllEditorEditables,
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

      this.onBeforeDestroy(async () => {
        // If for some reason editor not fired `destroy`, enforce deregistration.
        EditorsRegistry.the.unregister(editorId);
        unmountEffect();

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
      });

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
   * Destroys editor component.
   */
  override async destroyed() {
    this.el.style.display = 'none';
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

      // Query all editable elements along with their initial values in one pass.
      let editables = queryAllEditorEditables(editorId);
      const requiredRoots = Object.keys(editables);

      if (isSingleRootEditor(type)) {
        requiredRoots.push('main');
      }

      if (!checkIfAllRootsArePresent(editables, requiredRoots)) {
        editables = await waitForAllRootsToBePresent(editorId, requiredRoots);
      }

      // Do some postprocessing on received configuration.
      let resolvedConfig = {
        ...config,
        licenseKey: license.key,
        plugins: loadedPlugins,
        language,
        ...mixedTranslations.length && {
          translations: mixedTranslations,
        },
      };

      resolvedConfig = resolveEditorConfigElementReferences(resolvedConfig);
      resolvedConfig = resolveEditorConfigTranslations([...mixedTranslations].reverse(), language.ui, resolvedConfig);
      resolvedConfig = assignEditorRootsToConfig(Constructor, editables, resolvedConfig);

      const editor = await (async () => {
        if (!context) {
          return Constructor.create(resolvedConfig);
        }

        const result = await createEditorInContext({
          context,
          creator: Constructor,
          config: resolvedConfig,
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
 * Checks if all required root elements are present in the editables map.
 *
 * @param editables The editables map keyed by root name.
 * @param requiredRoots The list of required root names.
 * @returns True if all required roots are present, false otherwise.
 */
function checkIfAllRootsArePresent(editables: Record<string, EditableItem>, requiredRoots: string[]): boolean {
  return requiredRoots.every(rootId => editables[rootId]);
}

/**
 * Waits for all required root elements to be present in the DOM.
 *
 * @param editorId The editor's ID.
 * @param requiredRoots The list of required root names.
 * @returns A promise that resolves to the map of editable items.
 */
async function waitForAllRootsToBePresent(
  editorId: EditorId,
  requiredRoots: string[],
): Promise<Record<string, EditableItem>> {
  return waitFor(
    () => {
      const editables = queryAllEditorEditables(editorId);

      if (!checkIfAllRootsArePresent(editables, requiredRoots)) {
        throw new Error(
          'It looks like not all required root elements are present yet.\n'
          + '* If you want to wait for them, ensure they are registered before editor initialization.\n'
          + '* If you want lazy initialize roots, consider removing root values from the `initialData` config '
          + 'and assign initial data in editable components.\n'
          + `Missing roots: ${requiredRoots.filter(rootId => !editables[rootId]).join(', ')}.`,
        );
      }

      return editables;
    },
    { timeOutAfter: 2000, retryAfter: 100 },
  );
}

/**
 * Phoenix LiveView hook for CKEditor 5.
 */
export const EditorHook = makeHook(EditorHookImpl);
