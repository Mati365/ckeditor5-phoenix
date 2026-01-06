import type { EditorPreset } from '../../src/hooks/editor/typings';

import { html } from '../html';
import { createEditorPreset } from './create-editor-preset';

/**
 * Creates a CKEditor HTML structure for testing.
 */
export function createEditorHtmlElement(
  {
    id = 'test-editor',
    preset = createEditorPreset(),
    initialValue = '<p>Test content</p>',
    contextId,
    editableHeight = null,
    withInput = false,
    changeEvent = false,
    focusEvent = false,
    blurEvent = false,
    watchdog = false,
    saveDebounceMs = undefined,
    language,
    hookAttrs,
  }: EditorCreatorAttrs = {},
) {
  return html.div(
    {
      id,
      'phx-hook': 'CKEditor5',
      'phx-update': 'ignore',
      'cke-preset': JSON.stringify(preset),
      ...focusEvent && {
        'cke-focus-event': '',
      },
      ...blurEvent && {
        'cke-blur-event': '',
      },
      ...changeEvent && {
        'cke-change-event': '',
      },
      ...initialValue && {
        'cke-initial-value': initialValue,
      },
      ...editableHeight && {
        'cke-editable-height': editableHeight,
      },
      ...saveDebounceMs !== undefined && {
        'cke-save-debounce-ms': saveDebounceMs,
      },
      ...language?.ui && {
        'cke-language': language.ui,
      },
      ...language?.content && {
        'cke-content-language': language.content,
      },
      ...watchdog && {
        'cke-watchdog': '',
      },
      ...contextId && {
        'cke-context-id': contextId,
      },
      ...hookAttrs,
    },
    !['multiroot', 'decoupled'].includes(preset.type) && html.div({ id: `${id}_editor` }),
    withInput && html.input({
      type: 'hidden',
      id: `${id}_input`,
      name: 'content',
    }),
  );
}

/**
 * Attributes for creating an editor HTML element.
 */
type EditorCreatorAttrs = {
  id?: string;
  preset?: EditorPreset;
  contextId?: string;
  initialValue?: string | null;
  editableHeight?: number | null;
  withInput?: boolean;
  focusEvent?: boolean;
  blurEvent?: boolean;
  changeEvent?: boolean;
  watchdog?: boolean;
  saveDebounceMs?: number;
  hookAttrs?: Record<string, string>;
  language?: { ui?: string; content?: string; };
};
