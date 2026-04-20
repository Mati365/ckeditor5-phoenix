import type { Editor, MultiRootEditor } from 'ckeditor5';

/**
 * Check if passed editor is multiroot editor.
 */
export function isMultirootEditorInstance(editor: Editor): editor is MultiRootEditor {
  return 'addEditable' in editor.ui;
}
