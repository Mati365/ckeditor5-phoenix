import { DecoupledEditor } from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditableHtmlElement,
  createEditorHtmlElement,
  createEditorPreset,
  createUIPartHtmlElement,
  waitForTestEditor,
} from '~/test-utils';

import type { EditorId } from './editor/typings';

import { EditorHook } from './editor';
import { EditorsRegistry } from './editor/editors-registry';
import { UIPartHook } from './ui-part';

describe('ui part hook', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await EditorsRegistry.the.reset();
  });

  describe('mount', () => {
    it.for(['toolbar', 'menubar'])('should create a %s UI part', async (partName) => {
      await appendDecoupledEditor();

      const uiElement = createUIPartHtmlElement({ name: partName });

      document.body.appendChild(uiElement);
      UIPartHook.mounted.call({ el: uiElement });

      await vi.waitFor(() => {
        expect(uiElement.querySelector('.ck')).not.toBeNull();
      });
    });

    it('should log error when the UI part name is unknown', async () => {
      await appendDecoupledEditor();

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const uiElement = createUIPartHtmlElement({ name: 'unknown' });

      document.body.appendChild(uiElement);
      UIPartHook.mounted.call({ el: uiElement });

      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Unknown UI part name: "unknown". Supported names are "toolbar" and "menubar".'),
        );
      });
    });

    it('should be possible to add UI part before the editor is mounted', async () => {
      const uiElement = createUIPartHtmlElement({ name: 'toolbar' });

      document.body.appendChild(uiElement);
      UIPartHook.mounted.call({ el: uiElement });

      const editor = await appendDecoupledEditor();

      await vi.waitFor(() => {
        expect(editor.ui.view.toolbar.element).toBe(uiElement.querySelector('.ck'));
      });
    });

    it('should not match the UI parts from the other editors', async () => {
      const editor1 = await appendDecoupledEditor('editor-1');
      const editor2 = await appendDecoupledEditor('editor-2');

      const uiElement3 = createUIPartHtmlElement({ name: 'toolbar', editorId: 'editor-3' });
      const uiElement1 = createUIPartHtmlElement({ name: 'toolbar', editorId: 'editor-1' });
      const uiElement2 = createUIPartHtmlElement({ name: 'toolbar', editorId: 'editor-2' });

      document.body.appendChild(uiElement3);
      document.body.appendChild(uiElement1);
      document.body.appendChild(uiElement2);

      UIPartHook.mounted.call({ el: uiElement1 });
      UIPartHook.mounted.call({ el: uiElement2 });

      await vi.waitFor(() => {
        expect(uiElement1.querySelector('.ck')).toBe(editor1.ui.view.toolbar?.element);
        expect(uiElement2.querySelector('.ck')).toBe(editor2.ui.view.toolbar?.element);
      });
    });
  });

  describe('destroyed', () => {
    beforeEach(async () => {
      await appendDecoupledEditor();
    });

    it('should remove the UI part element from the DOM', async () => {
      const uiElement = createUIPartHtmlElement({ name: 'toolbar' });

      document.body.appendChild(uiElement);
      UIPartHook.mounted.call({ el: uiElement });

      await vi.waitFor(() => {
        expect(uiElement.querySelector('.ck')).not.toBeNull();
      });

      UIPartHook.destroyed.call({ el: uiElement });

      await vi.waitFor(() => {
        expect(uiElement.querySelector('.ck')).toBeNull();
      });
    });

    it('should hide the element during destruction to prevent flickering', async () => {
      const uiElement = createUIPartHtmlElement({ name: 'toolbar' });

      document.body.appendChild(uiElement);
      UIPartHook.mounted.call({ el: uiElement });

      await vi.waitFor(() => {
        expect(uiElement.style.display).toBe('');
      });

      UIPartHook.destroyed.call({ el: uiElement });

      await vi.waitFor(() => {
        expect(uiElement.style.display).toBe('none');
      });
    });
  });
});

async function appendDecoupledEditor(id: EditorId = 'test-editor') {
  const hookElement = createEditorHtmlElement({
    id,
    preset: createEditorPreset('decoupled', {
      menuBar: {
        isVisible: true,
      },
    }),
  });

  document.body.appendChild(hookElement);
  document.body.appendChild(createEditableHtmlElement());

  EditorHook.mounted.call({ el: hookElement });

  const editor = await waitForTestEditor<DecoupledEditor>(id);

  expect(editor).toBeInstanceOf(DecoupledEditor);

  return editor;
}
