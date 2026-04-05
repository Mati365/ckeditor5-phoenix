import { MultiRootEditor } from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditableHtmlElement,
  createEditorHtmlElement,
  createEditorPreset,
  waitForTestEditor,
} from '~/test-utils';

import type { EditorId } from '../editor/typings';

import { timeout } from '../../shared';
import { EditableHook } from '../editable';
import { EditorHook } from '../editor';
import { EditorsRegistry } from '../editor/editors-registry';
import { RootValueSentinel } from './root-value-sentinel';

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
      rootAttrs = { 'data-lang': 'pl', 'data-id': '42' },
    }: {
      rootName?: string;
      initialValue?: string;
      editorId?: EditorId;
      sentinelValue?: string;
      rootAttrs?: Record<string, string> | undefined | null;
    } = {},
  ) {
    const editor = await appendMultirootEditor(editorId);
    const editable = createEditableHtmlElement({
      name: rootName,
      editorId,
      initialValue,
    });

    document.body.appendChild(editable);
    EditableHook.mounted.call({ el: editable });

    await vi.waitFor(() => {
      expect(editor.getData({ rootName })).toBe(initialValue);
    });

    // Create a generic DOM element to act as our sentinel container
    const sentinel = document.createElement('div');
    sentinel.setAttribute('data-cke-value', sentinelValue);

    if (rootAttrs) {
      sentinel.setAttribute('data-cke-root-attrs', JSON.stringify(rootAttrs));
    }

    document.body.appendChild(sentinel);

    // Initialize the RootValueSentinel class
    const sentinelInstance = new RootValueSentinel({
      el: sentinel,
      editorId,
      rootName,
    });

    await timeout(0);

    return { editor, sentinel, sentinelInstance, editable };
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

      const sentinel = document.createElement('div');
      sentinel.setAttribute('data-cke-value', '<p>Value</p>');
      document.body.appendChild(sentinel);

      const instance = new RootValueSentinel({
        el: sentinel,
        editorId: 'test-editor',
        rootName: 'non-existent',
      });

      await timeout(0);

      expect(instance).to.be.instanceOf(RootValueSentinel);
    });

    it('should be possible to mount sentinel before the editor is ready', async () => {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('data-cke-value', '<p>Sentinel value</p>');
      document.body.appendChild(sentinel);

      const instance = new RootValueSentinel({
        el: sentinel,
        editorId: 'test-editor',
        rootName: 'main',
      });

      const editor = await appendMultirootEditor();
      const editable = createEditableHtmlElement({ name: 'main', initialValue: '<p>Initial</p>' });

      document.body.appendChild(editable);
      EditableHook.mounted.call({ el: editable });

      await vi.waitFor(() => {
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Initial</p>');
      });

      // Changing the attribute will trigger the MutationObserver in the background
      sentinel.setAttribute('data-cke-value', '<p>Updated value</p>');

      await vi.waitFor(() => {
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Updated value</p>');
      });

      expect(instance).to.be.instanceOf(RootValueSentinel);
    });
  });

  describe('updated (mutations)', () => {
    it('should update the editor root value when the value attribute changes', async () => {
      const { editor, sentinel } = await setup();

      sentinel.setAttribute('data-cke-value', '<p>Updated</p>');

      await vi.waitFor(() => {
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Updated</p>');
      });
    });

    it('should not call setData when the value attribute did not change', async () => {
      const { editor, sentinel } = await setup({ initialValue: '<p>Same value</p>' });
      const setDataSpy = vi.spyOn(editor, 'setData');

      // Change another observed attribute to trigger the observer reaction without changing the value
      sentinel.setAttribute('data-cke-root-attrs', JSON.stringify({ 'data-dummy': 'dummy' }));

      await timeout(0);
      expect(setDataSpy).not.toHaveBeenCalled();
    });

    it('should not call setData when the new value equals the current editor content', async () => {
      const { editor, sentinel } = await setup({ initialValue: '<p>Initial</p>' });

      // Change the editor content bypassing the sentinel
      editor.setData({ main: '<p>Same</p>' });
      const setDataSpy = vi.spyOn(editor, 'setData');

      // Update the sentinel to the same value as the editor
      sentinel.setAttribute('data-cke-value', '<p>Same</p>');

      await timeout(0); // Wait for the MutationObserver
      expect(setDataSpy).not.toHaveBeenCalled();
    });

    it('should defer update when the editor is focused and apply it on blur', async () => {
      const { editor, sentinel } = await setup();

      editor.ui.focusTracker.isFocused = true;

      sentinel.setAttribute('data-cke-value', '<p>Pending update</p>');

      await timeout(0); // Wait for the observer reaction
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

      await timeout(0); // Wait for the observer reaction

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

    it('should not crash when the editor has been destroyed before observer triggers', async () => {
      const { sentinel } = await setup();

      await EditorsRegistry.the.destroyAll();
      sentinel.setAttribute('data-cke-value', '<p>After destroy</p>');

      // Expect no error to be thrown during the asynchronous mutation
      await timeout(0);
    });
  });

  describe('destroy', () => {
    it('should clean up event listeners on destroy', async () => {
      const { editor, sentinelInstance } = await setup();

      const offDocumentSpy = vi.spyOn(editor.model.document, 'off');
      const offFocusTrackerSpy = vi.spyOn(editor.ui.focusTracker, 'off');

      // Call destroy on the class instance
      sentinelInstance.destroy();

      expect(offDocumentSpy).toHaveBeenCalledWith('change:data', expect.any(Function));
      expect(offFocusTrackerSpy).toHaveBeenCalledWith('change:isFocused', expect.any(Function));
    });
  });

  describe('root attributes', () => {
    it('should apply root attributes from data-cke-root-attrs on mount', async () => {
      const { editor } = await setup();
      const root = editor.model.document.getRoot()!;

      expect(root.getAttribute('data-lang')).toBe('pl');
      expect(root.getAttribute('data-id')).toBe('42');
    });

    it('should not crash when data-cke-root-attrs is absent on mount', async () => {
      const { editor } = await setup({
        rootAttrs: null,
      });

      const root = editor.model.document.getRoot()!;

      expect(root.getAttribute('data-lang')).toBeUndefined();
    });

    it('should update root attributes when data-cke-root-attrs changes', async () => {
      const { editor, sentinel } = await setup();

      sentinel.setAttribute('data-cke-root-attrs', JSON.stringify({ 'data-lang': 'en' }));

      await timeout(0); // Wait for the observer reaction

      const root = editor.model.document.getRoot()!;
      expect(root.getAttribute('data-lang')).toBe('en');
    });

    it('should remove root attributes that are no longer present', async () => {
      const { editor, sentinel } = await setup();
      const root = editor.model.document.getRoot()!;

      expect(root.getAttribute('data-lang')).toBe('pl');

      sentinel.setAttribute('data-cke-root-attrs', JSON.stringify({}));

      await timeout(0); // Wait for the observer

      expect(root.getAttribute('data-lang')).toBeUndefined();
      expect(root.getAttribute('data-id')).toBeUndefined();
    });

    it('should remove all managed attributes when data-cke-root-attrs is cleared', async () => {
      const { editor, sentinel } = await setup();
      const root = editor.model.document.getRoot()!;

      expect(root.getAttribute('data-lang')).toBe('pl');

      sentinel.removeAttribute('data-cke-root-attrs');

      await timeout(0); // Wait for the observer

      expect(root.getAttribute('data-lang')).toBeUndefined();
      expect(root.getAttribute('data-id')).toBeUndefined();
    });

    it('should not interfere with attributes managed by other consumers', async () => {
      const { editor, sentinel } = await setup();

      // Simulate another consumer setting its own attribute directly.
      editor.model.enqueueChange({ isUndoable: false }, (writer) => {
        const root = editor.model.document.getRoot()!;

        writer.setAttribute('data-external', 'keep-me', root);
      });

      sentinel.setAttribute('data-cke-root-attrs', JSON.stringify({ 'data-lang': 'en' }));

      await timeout(0); // Wait for the observer

      const root = editor.model.document.getRoot()!;

      expect(root.getAttribute('data-external')).toBe('keep-me');
      expect(root.getAttribute('data-lang')).toBe('en');
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
