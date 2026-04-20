import { ClassHook, makeHook } from '../shared';
import { EditorsRegistry } from './editor/editors-registry';

/**
 * UI Part hook for Phoenix LiveView. It allows you to create UI parts for multi-root editors.
 */
class UIPartHookImpl extends ClassHook {
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
   * Mounts the UI part component.
   */
  override mounted() {
    const { editorId, name } = this.attrs;

    const unmountEffect = EditorsRegistry.the.mountEffect(editorId, (editor) => {
      /* v8 ignore next 3 */
      if (this.isBeingDestroyed()) {
        return;
      }

      const { ui } = editor;

      const uiViewName = mapUIPartView(name);
      const uiPart = (ui.view as any)[uiViewName!];

      if (!uiPart) {
        console.error(`Unknown UI part name: "${name}". Supported names are "toolbar" and "menubar".`);
        return;
      }

      this.el.appendChild(uiPart.element);

      return () => {
        this.el.innerHTML = '';
      };
    });

    // Let's hide the element during destruction to prevent flickering.
    this.onBeforeDestroy(() => {
      this.el.style.display = 'none';
      unmountEffect();
    });
  }
}

/**
 * Maps the UI part name to the corresponding view in the editor.
 */
function mapUIPartView(name: string): string | null {
  switch (name) {
    case 'toolbar':
      return 'toolbar';

    case 'menubar':
      return 'menuBarView';

    default:
      return null;
  }
}

/**
 * Phoenix LiveView hook for CKEditor 5 UI parts.
 */
export const UIPartHook = makeHook(UIPartHookImpl);
