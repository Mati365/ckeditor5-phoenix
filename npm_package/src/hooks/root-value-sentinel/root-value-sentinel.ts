import type { Editor } from 'ckeditor5';

import type { EditorId } from '../editor';
import type { RootAttributesUpdater } from './root-attributes-updater';

import { parseJsonIfPresent } from '../../shared';
import { EditorsRegistry } from '../editor/editors-registry';
import { skipPendingPhoenixDataChangeSync } from '../editor/plugins';
import { createRootAttributesUpdater } from './root-attributes-updater';

export class RootValueSentinel {
  /**
   * The DOM element being observed for attribute changes.
   */
  private el: HTMLElement;

  /**
   * The unique identifier of the editor instance this sentinel is attached to.
   */
  private readonly editorId: EditorId | null;

  /**
   * The name of the specific root in a multi-root editor setup.
   */
  private readonly rootName: string;

  /**
   * The name of the HTML attribute storing the value.
   */
  private readonly valueAttrName: string;

  /**
   * The name of the HTML attribute storing the root attributes.
   */
  private readonly rootAttrsAttrName: string;

  /**
   * The MutationObserver instance responsible for watching attribute changes on the element.
   */
  private observer: MutationObserver | null = null;

  /**
   * A flag indicating whether the sentinel has been destroyed, used to prevent operations after cleanup.
   */
  private isDestroyed: boolean = false;

  /**
   * Cleanup callbacks to be executed when the sentinel is destroyed.
   */
  private cleanupCallbacks: Array<() => void> = [];

  /**
   * The promise that resolves to the editor instance once it's registered.
   * It can be either a MultiRootEditor or a DecoupledEditor, depending on the type of editor being used.
   * It will be null if the editor is not registered yet or if the hook is being destroyed before the editor is registered.
   */
  private editorPromise: Promise<Editor | null> | null = null;

  /**
   * When the editor is focused and the value attribute changes, we want to wait until it blurs to
   * avoid disrupting the user while typing. This variable holds the pending value that should be applied
   * once the editor blurs. It is set to null when there is no pending value or when the user makes changes in the editor,
   * indicating that the pending value should be discarded.
   */
  private pendingValue: string | null = null;

  /**
   * Cache the previous value to avoid reacting to attribute changes that don't actually change the value.
   * This can happen when the parent LiveView re-renders and sets the same value again, which would otherwise cause an
   * unnecessary update in the editor.
   */
  private previousValue: string | null = null;

  /**
   * Updater created once the editor is ready. Tracks which root attributes
   * were applied by this sentinel so it can clean them up independently of
   * other consumers.
   */
  private attrsUpdater: RootAttributesUpdater | null = null;

  /**
   * When the hook is mounted, we will wait for the editor to be registered and then set the initial value of the root.
   * Accepts an options object to configure element, identifiers, and custom attribute names.
   */
  constructor(
    {
      el,
      editorId,
      rootName,
      valueAttrName = 'data-cke-value',
      rootAttrsAttrName = 'data-cke-root-attrs',
    }: RootValueSentinelOptions,
  ) {
    this.el = el;
    this.editorId = editorId;
    this.rootName = rootName;
    this.valueAttrName = valueAttrName;
    this.rootAttrsAttrName = rootAttrsAttrName;

    const { value } = this.attrs;

    this.previousValue = value;
    this.editorPromise = EditorsRegistry.the.execute(this.editorId, (editor: Editor) => {
      /* v8 ignore next 3 */
      if (this.isDestroyed) {
        return null;
      }

      this.setupSyncHandlers(editor, this.rootName);
      return editor;
    });

    this.setupObserver();
  }

  /**
   * Helper to read and parse attributes from the element.
   * It uses dynamically provided attribute names.
   */
  private get attrs() {
    return {
      rootAttributes: parseJsonIfPresent<Record<string, unknown>>(this.el.getAttribute(this.rootAttrsAttrName)),
      value: this.el.getAttribute(this.valueAttrName)!,
    };
  }

  /**
   * Sets up a MutationObserver to listen for attribute changes on the element.
   */
  private setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          void this.handleUpdate();
          break;
        }
      }
    });

    this.observer.observe(this.el, {
      attributes: true,
      attributeFilter: [
        this.valueAttrName,
        this.rootAttrsAttrName,
      ],
    });
  }

  /**
   * When the value attribute changes, we want to update the editor root value.
   * However, if the editor is focused, we want to wait until it blurs to avoid disrupting the user while typing.
   */
  private async handleUpdate() {
    const { value, rootAttributes } = this.attrs;
    const editor = await this.editorPromise;

    if (!editor || editor.state === 'destroyed' || this.isDestroyed) {
      return;
    }

    // Synchronize root attributes on every update, regardless of value changes.
    let unmountLock: VoidFunction = () => {};

    editor.model.enqueueChange({ isUndoable: false }, () => {
      let updated = this.attrsUpdater?.(rootAttributes);

      // React only if the value attribute actually changed.
      if (value !== this.previousValue) {
        this.previousValue = value;

        if (editor.ui.focusTracker.isFocused) {
          this.pendingValue = value;
        }
        else {
          this.setRootValue(editor, this.rootName, value);
          updated = true;
        }
      }

      if (updated) {
        unmountLock = skipPendingPhoenixDataChangeSync(editor);
      }
    });

    unmountLock();
  }

  /**
   * Sets up focus-aware sync handlers on the editor.
   * Registers cleanup via onBeforeDestroy.
   */
  private setupSyncHandlers(editor: Editor, rootName: string) {
    this.attrsUpdater = createRootAttributesUpdater(editor, rootName);
    this.attrsUpdater(this.attrs.rootAttributes);

    const onDataChange = () => {
      this.pendingValue = null;
    };

    const onFocusChange = () => {
      if (!editor.ui.focusTracker.isFocused && this.pendingValue !== null) {
        this.setRootValue(editor, rootName, this.pendingValue);
        this.pendingValue = null;
      }
    };

    editor.model.document.on('change:data', onDataChange);
    editor.ui.focusTracker.on('change:isFocused', onFocusChange);

    this.cleanupCallbacks.push(() => {
      editor.model.document.off('change:data', onDataChange);
      editor.ui.focusTracker.off('change:isFocused', onFocusChange);
    });
  }

  /**
   * Sets the value of a specific root in the editor.
   */
  private setRootValue(editor: Editor, rootName: string, value: string) {
    const current = editor.getData({ rootName });

    if (current !== value) {
      editor.setData({ [rootName]: value });
    }
  }

  /**
   * Disconnects the observer and cleans up editor event listeners.
   * This should be called manually when the element is removed from the DOM.
   */
  public destroy() {
    this.isDestroyed = true;
    this.observer?.disconnect();

    this.cleanupCallbacks.forEach(cleanup => cleanup());
    this.cleanupCallbacks = [];
  }
}

export type RootValueSentinelOptions = {
  /**
   * The DOM element being observed for attribute changes.
   */
  el: HTMLElement;

  /**
   * The unique identifier of the editor instance this sentinel is attached to.
   */
  editorId: string | null;

  /**
   * The name of the specific root in a multi-root editor setup.
   */
  rootName: string;

  /**
   * The name of the HTML attribute storing the value. Defaults to 'data-cke-value'.
   */
  valueAttrName?: string;

  /**
   * The name of the HTML attribute storing the root attributes. Defaults to 'data-cke-root-attrs'.
   */
  rootAttrsAttrName?: string;
};
