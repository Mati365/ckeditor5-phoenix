import type { Context, ContextWatchdog, Editor, EditorConfig } from 'ckeditor5';

import { uid } from '../../../shared';

/**
 * Symbol used to store the context watchdog on the editor instance.
 * Internal use only.
 */
const CONTEXT_EDITOR_WATCHDOG_SYMBOL = Symbol.for('context-editor-watchdog');

/**
 * Creates a CKEditor 5 editor instance within a given context watchdog.
 *
 * @param params Parameters for editor creation.
 * @param params.element The DOM element or data for the editor.
 * @param params.context The context watchdog instance.
 * @param params.creator The editor creator utility.
 * @param params.config The editor configuration object.
 * @returns The created editor instance.
 */
export async function createEditorInContext({ element, context, creator, config }: Attrs) {
  const editorContextId = uid();

  await context.add({
    creator: (_element, _config) => creator.create(_element, _config),
    id: editorContextId,
    sourceElementOrData: element,
    type: 'editor',
    config,
  });

  const editor = context.getItem(editorContextId) as Editor;
  const contextDescriptor: EditorContextDescriptor = {
    state: 'available',
    editorContextId,
    context,
  };

  (editor as any)[CONTEXT_EDITOR_WATCHDOG_SYMBOL] = contextDescriptor;

  // Destroying of context is async. There can be situation when the destroy of the context
  // and the destroy of the editor is called in parallel. It often happens during unmounting of
  // phoenix hooks. Let's make sure that descriptor informs other components, that context is being
  // destroyed.
  const originalDestroy = context.destroy.bind(context);
  context.destroy = async () => {
    contextDescriptor.state = 'unavailable';
    return originalDestroy();
  };

  return {
    ...contextDescriptor,
    editor,
  };
}

/**
 * Retrieves the context watchdog from an editor instance, if available.
 *
 * @param editor The editor instance.
 * @returns The context watchdog or null if not found.
 */
export function unwrapEditorContext(editor: Editor): EditorContextDescriptor | null {
  if (CONTEXT_EDITOR_WATCHDOG_SYMBOL in editor) {
    return (editor as any)[CONTEXT_EDITOR_WATCHDOG_SYMBOL];
  }

  return null;
}

/**
 * Parameters for creating an editor in a context.
 */
type Attrs = {
  context: ContextWatchdog<Context>;
  creator: EditorCreator;
  element: HTMLElement;
  config: EditorConfig;
};

/**
 * Descriptor for an editor context.
 */
type EditorContextDescriptor = {
  state: 'available' | 'unavailable';
  editorContextId: string;
  context: ContextWatchdog<Context>;
};

/**
 * Type representing an Editor creator with a create method.
 */
type EditorCreator = {
  create: (...args: any) => Promise<Editor>;
};
