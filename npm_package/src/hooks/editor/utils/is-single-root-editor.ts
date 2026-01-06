import type { EditorType } from '../typings';

/**
 * Checks if the given editor type is one of the single editing-like editors.
 *
 * @param editorType - The type of the editor to check.
 * @returns `true` if the editor type is 'inline', 'classic', or 'balloon', otherwise `false`.
 */
export function isSingleRootEditor(editorType: EditorType): boolean {
  return ['inline', 'classic', 'balloon', 'decoupled'].includes(editorType);
}
