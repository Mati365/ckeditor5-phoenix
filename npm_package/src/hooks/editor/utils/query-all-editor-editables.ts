import type { EditorId } from '../typings';

/**
 * Queries all editable elements within a specific editor instance.
 *
 * @param editorId The ID of the editor to query.
 * @returns An object mapping editable names to their corresponding elements and initial values.
 */
export function queryAllEditorEditables(editorId: EditorId): Record<string, EditableItem> {
  const iterator = document.querySelectorAll<HTMLElement>(
    [
      `[data-cke-editor-id="${editorId}"][data-cke-editable-root-name]`,
      '[data-cke-editable-root-name]:not([data-cke-editor-id])',
    ]
      .join(', '),
  );

  const acc = (
    Array
      .from(iterator)
      .reduce<Record<string, EditableItem>>((acc, element) => {
        const name = element.getAttribute('data-cke-editable-root-name');
        const initialValue = element.getAttribute('data-cke-editable-initial-value') || '';
        const content = element.querySelector('[data-cke-editable-content]') as HTMLElement;

        if (!name || !content) {
          return acc;
        }

        return {
          ...acc,
          [name]: {
            content,
            initialValue,
          },
        };
      }, Object.create(null))
  );

  const rootEditorElement = document.querySelector<HTMLElement>(`[phx-hook="CKEditor5"][id="${editorId}"]`);

  if (!rootEditorElement) {
    return acc;
  }

  const initialRootEditableValue = rootEditorElement.getAttribute('data-cke-initial-value') || '';
  const contentElement = rootEditorElement.querySelector<HTMLElement>(`#${editorId}_editor `);
  const currentMain = acc['main'];

  if (currentMain) {
    return {
      ...acc,
      main: {
        ...currentMain,
        initialValue: currentMain.initialValue || initialRootEditableValue,
      },
    };
  }

  if (contentElement) {
    return {
      ...acc,
      main: {
        content: contentElement,
        initialValue: initialRootEditableValue,
      },
    };
  }

  return acc;
}

/**
 * Type representing an editable item within an editor.
 */
export type EditableItem = {
  content: HTMLElement;
  initialValue: string;
};
