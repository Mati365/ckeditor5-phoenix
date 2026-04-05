import type { EditorType } from '../typings';

/**
 * Checks if the given editor type enforces user to define editables using separate components.
 *
 * @param editorType - The type of the editor to check.
 * @returns `true` if the editor type is 'decoupled' or 'multiroot', otherwise `false`.
 */
export function isEditorWithExternalEditables(editorType: EditorType): boolean {
  return ['multiroot', 'decoupled'].includes(editorType);
}
