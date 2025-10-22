import type { MultiRootEditor } from 'ckeditor5';

import { ClassHook, debounce, makeHook } from '../shared';
import { EditorsRegistry } from './editor/editors-registry';

/**
 * Editable hook for Phoenix LiveView. It allows you to create editables for multi-root editors.
 */
class EditableHookImpl extends ClassHook {
  /**
   * The name of the hook.
   */
  private editorPromise: Promise<MultiRootEditor> | null = null;

  /**
   * Attributes for the editable instance.
   */
  private get attrs() {
    const value = {
      editableId: this.el.getAttribute('id')!,
      editorId: this.el.getAttribute('data-cke-editor-id') || null,
      rootName: this.el.getAttribute('data-cke-editable-root-name')!,
      initialValue: this.el.getAttribute('data-cke-editable-initial-value') || '',
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
   * Mounts the editable component.
   */
  override async mounted() {
    const { editableId, editorId, rootName, initialValue } = this.attrs;
    const input = this.el.querySelector<HTMLInputElement>(`#${editableId}_input`);

    // If the editor is not registered yet, we will wait for it to be registered.
    this.editorPromise = EditorsRegistry.the.execute(editorId, (editor: MultiRootEditor) => {
      const { ui, editing, model } = editor;

      if (model.document.getRoot(rootName)) {
        return editor;
      }

      editor.addRoot(rootName, {
        isUndoable: false,
        data: initialValue,
      });

      const contentElement = this.el.querySelector('[data-cke-editable-content]') as HTMLElement | null;
      const editable = ui.view.createEditable(rootName, contentElement!);

      ui.addEditable(editable);
      editing.view.forceRender();

      if (input) {
        syncEditorRootToInput(input, editor, rootName);
      }

      return editor;
    });
  }

  /**
   * Destroys the editable component. Unmounts root from the editor.
   */
  override async destroyed() {
    const { rootName } = this.attrs;

    // Let's hide the element during destruction to prevent flickering.
    this.el.style.display = 'none';

    // Let's wait for the mounted promise to resolve before proceeding with destruction.
    const editor = await this.editorPromise;
    this.editorPromise = null;

    // Unmount root from the editor.
    if (editor && editor.state !== 'destroyed') {
      const root = editor.model.document.getRoot(rootName);

      if (root && 'detachEditable' in editor) {
        editor.detachEditable(root);
        editor.detachRoot(rootName, false);
      }
    }
  }
}

/**
 * Phoenix LiveView hook for CKEditor 5 editable elements.
 */
export const EditableHook = makeHook(EditableHookImpl);

/**
 * Synchronizes the editor's root data to the corresponding input element.
 * This is used to keep the input value in sync with the editor's content.
 *
 * @param input - The input element to synchronize with the editor.
 * @param editor - The CKEditor instance.
 * @param rootName - The name of the root to synchronize.
 */
function syncEditorRootToInput(input: HTMLInputElement, editor: MultiRootEditor, rootName: string) {
  const sync = () => {
    input.value = editor.getData({ rootName });
  };

  editor.model.document.on('change:data', debounce(100, sync));
  sync();
}
