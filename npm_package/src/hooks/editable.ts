import type { DecoupledEditor, MultiRootEditor } from 'ckeditor5';

import { ClassHook, debounce, makeHook } from '../shared';
import { isMultirootEditorInstance } from './editor';
import { EditorsRegistry } from './editor/editors-registry';
import { RootValueSentinel } from './root-value-sentinel';

/**
 * Editable hook for Phoenix LiveView. It allows you to create editables for multi-root editors.
 */
class EditableHookImpl extends ClassHook {
  /**
   * The sentinel instance responsible for tracking and updating root values and attributes.
   */
  private sentinel: RootValueSentinel | null = null;

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
  override mounted() {
    const { editableId, editorId, rootName, initialValue } = this.attrs;

    const unmountEffect = EditorsRegistry.the.mountEffect(editorId, (editor: MultiRootEditor | DecoupledEditor) => {
      const contentElement = this.el.querySelector('[data-cke-editable-content]') as HTMLElement;

      /* v8 ignore next 3 */
      if (this.isBeingDestroyed()) {
        return;
      }

      const input = this.el.querySelector<HTMLInputElement>(`#${editableId}_input`);

      if (isMultirootEditorInstance(editor) && !editor.model.document.getRoot(rootName)) {
        const { ui, editing } = editor;

        editor.addRoot(rootName, {
          isUndoable: false,
          data: initialValue,
        });

        const editable = ui.view.createEditable(rootName, contentElement);

        ui.addEditable(editable);
        editing.view.forceRender();
      }

      this.sentinel = new RootValueSentinel({
        el: this.el,
        editor,
        rootName,
        valueAttrName: 'data-cke-editable-initial-value',
        rootAttrsAttrName: 'data-cke-editable-root-attrs',
      });

      const unsyncInput = input ? syncEditorRootToInput(input, editor, rootName) : null;

      return () => {
        unsyncInput?.();

        this.sentinel?.destroy();
        this.sentinel = null;

        if (editor.state !== 'destroyed') {
          const root = editor.model.document.getRoot(rootName);

          if (root && isMultirootEditorInstance(editor)) {
            if (editor.ui.view.editables[rootName]) {
              editor.detachEditable(root);
            }

            if (root.isAttached()) {
              editor.detachRoot(rootName, false);
            }
          }
        }
      };
    });

    // Let's hide the element during destruction to prevent flickering.
    this.onBeforeDestroy(() => {
      this.el.style.display = 'none';
      unmountEffect();
    });
  }

  /**
   * Watch attributes changes and sync value if something changed.
   */
  override async updated() {
    this.sentinel?.updated();
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
function syncEditorRootToInput(
  input: HTMLInputElement,
  editor: MultiRootEditor | DecoupledEditor,
  rootName: string,
) {
  const sync = () => {
    input.value = editor.getData({ rootName });
  };

  const debouncedSync = debounce(200, sync);

  editor.model.document.on('change:data', debouncedSync);
  sync();

  return () => {
    editor.model.document.off('change:data', debouncedSync);
  };
}
