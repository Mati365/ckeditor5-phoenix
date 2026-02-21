import { MultiRootEditor } from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditableHtmlElement,
  createEditorHtmlElement,
  createEditorPreset,
  waitForTestEditor,
} from '~/test-utils';
import { createRootValueSentinelElement } from '~/test-utils/editor/create-root-value-sentinel-element';

import type { EditorId } from './editor/typings';

import { timeout } from '../shared';
import { EditableHook } from './editable';
import { EditorHook } from './editor';
import { EditorsRegistry } from './editor/editors-registry';
import { RootValueSentinelHook } from './root-value-sentinel';

describe('root value sentinel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await EditorsRegistry.the.destroyAll();
  });

  /**
   * Sets up a multiroot editor with an editable root, plus a mounted sentinel.
   */
  async function setup(
    {
      rootName = 'main',
      initialValue = '<p>Initial</p>',
      editorId = 'test-editor' as EditorId,
      sentinelValue = initialValue,
    }: {
      rootName?: string;
      initialValue?: string;
      editorId?: EditorId;
      sentinelValue?: string;
    } = {},
  ) {
    const editor = await appendMultirootEditor(editorId);

    const editable = createEditableHtmlElement({ name: rootName, initialValue });
    document.body.appendChild(editable);
    EditableHook.mounted.call({ el: editable });

    await vi.waitFor(() => {
      expect(editor.getData({ rootName })).toBe(initialValue);
    });

    // Add sentinel and wait a little bit to ensure the hook is initialized.
    const sentinel = createRootValueSentinelElement({ root: rootName, value: sentinelValue, editorId });
    document.body.appendChild(sentinel);
    RootValueSentinelHook.mounted.call({ el: sentinel });
    await timeout(0);

    return { editor, sentinel, editable };
  }

  describe('mount', () => {
    it('should not change the editor root value on mount', async () => {
      const { editor } = await setup({
        initialValue: '<p>Unchanged</p>',
        sentinelValue: '<p>Should not apply</p>',
      });

      expect(editor.getData({ rootName: 'main' })).toBe('<p>Unchanged</p>');
    });

    it('should not crash when the root does not exist', async () => {
      await appendMultirootEditor();

      const sentinel = createRootValueSentinelElement({ root: 'non-existent', value: '<p>Value</p>' });
      document.body.appendChild(sentinel);

      // We just call the hook and flush the event loop.
      // If it throws an unhandled rejection, Vitest will automatically fail this test.
      RootValueSentinelHook.mounted.call({ el: sentinel });
      await timeout(0);
    });

    it('should be possible to mount sentinel before the editor is ready', async () => {
      const sentinel = createRootValueSentinelElement({ root: 'main', value: '<p>Sentinel value</p>' });
      document.body.appendChild(sentinel);
      RootValueSentinelHook.mounted.call({ el: sentinel });

      const editor = await appendMultirootEditor();
      const editable = createEditableHtmlElement({ name: 'main', initialValue: '<p>Initial</p>' });

      document.body.appendChild(editable);
      EditableHook.mounted.call({ el: editable });

      await vi.waitFor(() => {
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Initial</p>');
      });

      sentinel.setAttribute('data-cke-value', '<p>Updated value</p>');
      RootValueSentinelHook.updated!.call({ el: sentinel });

      await vi.waitFor(() => {
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Updated value</p>');
      });
    });
  });

  describe('updated', () => {
    it('should update the editor root value when the value attribute changes', async () => {
      const { editor, sentinel } = await setup();

      sentinel.setAttribute('data-cke-value', '<p>Updated</p>');
      RootValueSentinelHook.updated!.call({ el: sentinel });

      await vi.waitFor(() => {
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Updated</p>');
      });
    });

    it('should not call setData when the value attribute did not change', async () => {
      const { editor, sentinel } = await setup({ initialValue: '<p>Same value</p>' });
      const setDataSpy = vi.spyOn(editor, 'setData');

      RootValueSentinelHook.updated!.call({ el: sentinel });

      await timeout(0);
      expect(setDataSpy).not.toHaveBeenCalled();
    });

    it('should not call setData when the new value equals the current editor content', async () => {
      const { editor, sentinel } = await setup({ initialValue: '<p>Same</p>' });
      const setDataSpy = vi.spyOn(editor, 'setData');

      sentinel.setAttribute('data-cke-value', '<p>Same</p>');
      RootValueSentinelHook.updated!.call({ el: sentinel });

      await timeout(0);
      expect(setDataSpy).not.toHaveBeenCalled();
    });

    it('should defer update when the editor is focused and apply it on blur', async () => {
      const { editor, sentinel } = await setup();

      editor.ui.focusTracker.isFocused = true;

      sentinel.setAttribute('data-cke-value', '<p>Pending update</p>');
      RootValueSentinelHook.updated!.call({ el: sentinel });

      await timeout(0);
      expect(editor.getData({ rootName: 'main' })).toBe('<p>Initial</p>');

      editor.ui.focusTracker.isFocused = false;

      await vi.waitFor(() => {
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Pending update</p>');
      });
    });

    it('should discard pending value if user types while editor is focused', async () => {
      const { editor, sentinel } = await setup();

      editor.ui.focusTracker.isFocused = true;

      sentinel.setAttribute('data-cke-value', '<p>Pending value</p>');
      RootValueSentinelHook.updated!.call({ el: sentinel });

      await timeout(0);

      editor.model.change((writer) => {
        const root = editor.model.document.getRoot('main')!;
        const paragraph = writer.createElement('paragraph');

        writer.append(paragraph, root);
        writer.insertText('user typed', paragraph);
      });

      const userContent = editor.getData({ rootName: 'main' });
      editor.ui.focusTracker.isFocused = false;

      await timeout(0);

      expect(editor.getData({ rootName: 'main' })).toBe(userContent);
    });

    it('should not crash when the editor has been destroyed before updated is called', async () => {
      const { sentinel } = await setup();

      await EditorsRegistry.the.destroyAll();
      sentinel.setAttribute('data-cke-value', '<p>After destroy</p>');

      RootValueSentinelHook.updated!.call({ el: sentinel });
      await timeout(0);
    });
  });

  describe('destroy', () => {
    it('should clean up event listeners on destroy', async () => {
      const { editor, sentinel } = await setup();

      const offDocumentSpy = vi.spyOn(editor.model.document, 'off');
      const offFocusTrackerSpy = vi.spyOn(editor.ui.focusTracker, 'off');

      RootValueSentinelHook.destroyed!.call({ el: sentinel });

      expect(offDocumentSpy).toHaveBeenCalledWith('change:data', expect.any(Function));
      expect(offFocusTrackerSpy).toHaveBeenCalledWith('change:isFocused', expect.any(Function));
    });
  });
});

async function appendMultirootEditor(id: EditorId = 'test-editor') {
  const hookElement = createEditorHtmlElement({
    id,
    preset: createEditorPreset('multiroot'),
  });

  document.body.appendChild(hookElement);
  EditorHook.mounted.call({ el: hookElement });

  const editor = await waitForTestEditor<MultiRootEditor>(id);
  expect(editor).toBeInstanceOf(MultiRootEditor);

  return editor;
}
