import type { EditorId } from '../../src/hooks/editor/typings';

import { html } from '../html';

export function createRootValueSentinelElement(
  {
    root = 'main',
    editorId = 'test-editor',
    value,
  }: {
    root?: string;
    value?: string;
    editorId?: EditorId;
  },
): HTMLElement {
  return html.div(
    {
      'data-cke-root-name': root,
      'data-cke-value': value,
      'data-cke-editor-id': editorId,
    },
  );
}
