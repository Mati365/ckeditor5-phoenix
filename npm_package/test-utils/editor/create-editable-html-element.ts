import type { EditorId } from '../../src/hooks/editor/typings';

import { html } from '../html';

/**
 * Creates a editable element with the given name and initial value.
 */
export function createEditableHtmlElement(
  {
    name = 'main',
    id = `${name}-editable`,
    editorId,
    initialValue,
    withInput = false,
    modelElement,
  }: {
    id?: string;
    editorId?: EditorId;
    name?: string;
    initialValue?: string;
    withInput?: boolean;
    modelElement?: string;
  } = {},
) {
  return html.div(
    {
      'id': id,
      'data-cke-editable-root-name': name,
      ...editorId && {
        'data-cke-editor-id': editorId,
      },
      ...initialValue && {
        'data-cke-editable-initial-value': initialValue,
      },
      ...modelElement && {
        'data-cke-editable-root-model-element-name': modelElement,
      },
    },
    html.div({
      'class': 'editable-content',
      'data-cke-editable-content': '',
    }),
    withInput && html.input({
      type: 'hidden',
      id: `${id}_input`,
      name: 'content',
    }),
  );
}
