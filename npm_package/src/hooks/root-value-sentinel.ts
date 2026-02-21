import type { Editor } from 'ckeditor5';

import { ClassHook, makeHook } from '../shared';
import { EditorsRegistry } from './editor/editors-registry';

class RootValueSentinel extends ClassHook {
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
   * Helper to read and parse attributes from the element.
   * It assumes that the element has the correct attributes set, as they are required for the hook to function properly.
   */
  private get attrs() {
    return {
      editorId: this.el.getAttribute('data-cke-editor-id')!,
      rootName: this.el.getAttribute('data-cke-root-name')!,
      value: this.el.getAttribute('data-cke-value')!,
    };
  }

  /**
   * When the hook is mounted, we will wait for the editor to be registered and then set the initial value of the root.
   */
  override async mounted() {
    const { editorId, value, rootName } = this.attrs;

    this.previousValue = value;
    this.editorPromise = EditorsRegistry.the.execute(editorId, (editor: Editor) => {
      /* v8 ignore next 3 */
      if (this.isBeingDestroyed()) {
        return null;
      }

      this.setupSyncHandlers(editor, rootName);

      return editor;
    });
  }

  /**
   * When the value attribute changes, we want to update the editor root value.
   * However, if the editor is focused, we want to wait until it blurs to avoid disrupting the user while typing.
   */
  override async updated() {
    const { rootName, value } = this.attrs;

    // React only if the value attribute actually changed.
    if (value === this.previousValue) {
      return;
    }

    this.previousValue = value;

    const editor = await this.editorPromise;

    if (!editor || editor.state === 'destroyed') {
      return;
    }

    if (editor.ui.focusTracker.isFocused) {
      this.pendingValue = value;
    }
    else {
      this.setRootValue(editor, rootName, value);
    }
  }

  /**
   * Sets up focus-aware sync handlers on the editor.
   * Registers cleanup via onBeforeDestroy.
   */
  private setupSyncHandlers(editor: Editor, rootName: string) {
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

    this.onBeforeDestroy(() => {
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
}

export const RootValueSentinelHook = makeHook(RootValueSentinel);
