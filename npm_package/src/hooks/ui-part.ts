import { ClassHook, makeHook } from '../shared';
import { EditorsRegistry } from './editor/editors-registry';

/**
 * UI Part hook for Phoenix LiveView. It allows you to create UI parts for multi-root editors.
 */
class UIPartHookImpl extends ClassHook {
  /**
   * The name of the hook.
   */
  private mountedPromise: Promise<void> | null = null;

  /**
   * Attributes for the editable instance.
   */
  private get attrs() {
    const value = {
      editorId: this.el.getAttribute('data-cke-editor-id') || null,
      name: this.el.getAttribute('data-cke-ui-part-name')!,
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
    const { editorId, name } = this.attrs;

    // If the editor is not registered yet, we will wait for it to be registered.
    this.mountedPromise = EditorsRegistry.the.execute(editorId, (editor) => {
      const { ui } = editor;
      const uiPart = (ui.view as any)[name];

      if (!uiPart || !(uiPart.element instanceof HTMLElement)) {
        throw new Error(`UI part "${name}" is not registered in the editor "${editorId}" or is not an HTMLElement.`);
      }

      this.el.appendChild(uiPart.element);
    });
  }

  /**
   * Destroys the editable component. Unmounts root from the editor.
   */
  override async destroyed() {
    // Let's hide the element during destruction to prevent flickering.
    this.el.style.display = 'none';

    // Let's wait for the mounted promise to resolve before proceeding with destruction.
    await this.mountedPromise;
    this.mountedPromise = null;

    // Unmount all UI parts from the editor.
    this.el.innerHTML = '';
  }
}

/**
 * Phoenix LiveView hook for CKEditor 5 UI parts.
 */
export const UIPartHook = makeHook(UIPartHookImpl);
