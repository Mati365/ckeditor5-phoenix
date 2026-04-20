import type { Editor } from 'ckeditor5';

import type { RootAttributesUpdater } from './root-attributes-updater';

import { parseJsonIfPresent } from '../../shared';
import { skipPendingPhoenixDataChangeSync } from '../editor/plugins';
import { createRootAttributesUpdater } from './root-attributes-updater';

export class RootValueSentinel {
  /**
   * The DOM element being observed for attribute changes.
   */
  private el: HTMLElement;

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
   * A flag indicating whether the sentinel has been destroyed, used to prevent operations after cleanup.
   */
  private isDestroyed: boolean = false;

  /**
   * Cleanup callbacks to be executed when the sentinel is destroyed.
   */
  private cleanupCallbacks: Array<() => void> = [];

  /**
   * The editor instance.
   */
  private editor: Editor;

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
      editor,
      rootName,
      valueAttrName = 'data-cke-value',
      rootAttrsAttrName = 'data-cke-root-attrs',
    }: RootValueSentinelOptions,
  ) {
    this.el = el;
    this.editor = editor;
    this.rootName = rootName;
    this.valueAttrName = valueAttrName;
    this.rootAttrsAttrName = rootAttrsAttrName;

    const { value } = this.attrs;

    this.previousValue = value;
    this.setupSyncHandlers(editor, this.rootName);
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
   * When the value attribute changes, we want to update the editor root value.
   * However, if the editor is focused, we want to wait until it blurs to avoid disrupting the user while typing.
   */
  async updated() {
    const { editor } = this;
    const { value, rootAttributes } = this.attrs;

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
   * Editor instance.
   */
  editor: Editor;

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
