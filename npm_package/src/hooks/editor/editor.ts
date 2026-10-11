import type { Context, Editor } from 'ckeditor5';

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
      // Load `ckeditor5` in parallel, so there is no extra tick between creating the editor
      // and checking if the hook is still alive.
      const [{ editor, context }, { onEditorError }] = await Promise.all([
        this.createEditor(),
        import('ckeditor5'),
      ]);

      if (this.isBeingDestroyed()) {
        await destroyEditorIfOwned(editorId, editor, context);
        return;
      }

      const offEditorError = onEditorError(({ error, source }) => {
        if (source !== editor) {
          return;
        }

        console.error(`Editor "${editorId}" failed.`, error);
        editor.enableReadOnlyMode('error-handling');
      });

      // Bind lifecycle of the integration to the registered editor instance.
      const unmountEffect = EditorsRegistry.the.mountEffect(editorId, (editor) => {
        editor.once('destroy', () => {
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
        offEditorError();

        await destroyEditorIfOwned(editorId, editor, context);
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
   * Creates the CKEditor instance (optionally within a context).
   */
  private async createEditor(): Promise<{ editor: Editor; context: Context | null; }> {
    const { contextId } = this.attrs;

    const context: Context | null = await (
      contextId
        ? ContextsRegistry.the.waitFor(contextId)
        : getNearestContextParentPromise(this.el)
    );

    const editor = await this.buildEditor(context);

    return { editor, context };
  }

  /**
   * Builds the full editor configuration and creates the editor instance.
   */
  private async buildEditor(context: Context | null): Promise<Editor> {
    const {
      preset,
      editorId,
      editableHeight,
      events,
      saveDebounceMs,
      language,
    } = this.attrs;

    const { customTranslations, type, license, config: { plugins, ...config } } = preset;

    const Constructor = await loadEditorConstructor(type);
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

    const editor = await Constructor.create(
      context
        ? { ...resolvedConfig, context }
        : resolvedConfig,
    );

    if (isSingleRootEditor(type) && editableHeight) {
      setEditorEditableHeight(editor, editableHeight);
    }

    return editor;
  }
}

/**
 * Destroys the editor, unless its context is already being destroyed (it'll take care of its editors then).
 * Never rejects, because callers (like `onBeforeDestroy` callbacks) are not awaited by the hook.
 *
 * @param editorId The editor's ID (used for logging).
 * @param editor The editor instance.
 * @param context The context the editor was created in, if any.
 */
async function destroyEditorIfOwned(editorId: EditorId, editor: Editor, context: Context | null): Promise<void> {
  // Destroying of context is async. If the context is already being destroyed (it often happens
  // during unmounting of phoenix hooks), it'll take care of its editors, so don't touch them.
  if (context && ContextsRegistry.the.isDestroying(context)) {
    return;
  }

  try {
    if (editor.state !== 'destroyed') {
      await editor.destroy();
    }
  }
  catch (error) {
    console.error(`Failed to destroy editor "${editorId}".`, error);
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
