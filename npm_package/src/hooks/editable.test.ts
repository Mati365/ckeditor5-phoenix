import { MultiRootEditor } from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditableHtmlElement,
  createEditorHtmlElement,
  createEditorPreset,
  waitForTestEditor,
} from '~/test-utils';

import { EditableHook } from './editable';
import { EditorHook } from './editor';
import { EditorsRegistry } from './editor/editors-registry';

describe('editable hook', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await EditorsRegistry.the.destroyAll();
  });

  describe('mount', () => {
    it('should add editable root to the editor after mounting', async () => {
      const editor = await appendMultirootEditor();
      const editable = createEditableHtmlElement({
        name: 'foo',
        initialValue: '<p>Foo</p>',
      });

      document.body.appendChild(editable);

      expect(() => editor.getData({ rootName: 'foo' })).toThrow(/datacontroller-get-non-existent-root/);

      EditableHook.mounted.call({ el: editable });

      expect(editor.getData({ rootName: 'foo' })).toBe('<p>Foo</p>');
    });

    it('should do nothing if the editable root already exists', async () => {
      const editor = await appendMultirootEditor();
      const editable = createEditableHtmlElement({
        name: 'foo',
        initialValue: '<p>Foo</p>',
      });

      document.body.appendChild(editable);
      EditableHook.mounted.call({ el: editable });

      expect(editor.getData({ rootName: 'foo' })).toBe('<p>Foo</p>');

      EditableHook.mounted.call({ el: editable });

      expect(editor.getData({ rootName: 'foo' })).toBe('<p>Foo</p>');
    });

    it('should render editable content in the editor', async () => {
      await appendMultirootEditor();

      const editable = createEditableHtmlElement({
        name: 'foo',
        initialValue: '<p>Foo</p>',
      });

      document.body.appendChild(editable);
      EditableHook.mounted.call({ el: editable });

      const contentElement = editable.querySelector('[data-cke-editable-content]') as HTMLElement;

      expect(contentElement).not.toBeNull();
      expect(contentElement.classList.contains('ck-content')).toBe(true);
      expect(contentElement.innerHTML).toBe('<p>Foo</p>');
    });

    it('should not crash if initial value is not set', async () => {
      await appendMultirootEditor();

      const editable = createEditableHtmlElement({
        name: 'foo',
      });

      document.body.appendChild(editable);
      EditableHook.mounted.call({ el: editable });

      const contentElement = editable.querySelector('[data-cke-editable-content]') as HTMLElement;

      expect(contentElement).not.toBeNull();
      expect(contentElement.classList.contains('ck-content')).toBe(true);
      expect(contentElement.innerHTML).toBe('<p><br data-cke-filler="true"></p>');
    });

    it('should be possible to add editable before the editor is mounted', async () => {
      const editable = createEditableHtmlElement({
        name: 'foo',
        initialValue: '<p>Foo</p>',
      });

      document.body.appendChild(editable);

      const editor = await appendMultirootEditor();

      expect(editor.getData({ rootName: 'foo' })).toBe('<p>Foo</p>');
    });
  });

  describe('value synchronization', () => {
    beforeEach(async () => {
      await appendMultirootEditor();

      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not crash if input is not present', async () => {
      const editableElement = createEditableHtmlElement({
        initialValue: '<p>Test content</p>',
        withInput: false,
      });

      document.body.appendChild(editableElement);

      await waitForTestEditor();
    });

    it('should initialize the input with the initial value', async () => {
      const initialValue = '<p>Test content</p>';
      const editableElement = createEditableHtmlElement({
        initialValue,
        name: 'second',
        withInput: true,
      });

      document.body.appendChild(editableElement);
      EditableHook.mounted.call({ el: editableElement });

      await waitForTestEditor();

      const input = editableElement.querySelector<HTMLInputElement>(`#${editableElement.id}_input`);

      expect(input).not.toBeNull();
      expect(input!.value).toBe(initialValue);
    });

    it('should assign the initial value to the editor root', async () => {
      const initialValue = '<p>Initial editable value</p>';
      const editableElement = createEditableHtmlElement({
        initialValue,
        name: 'foo',
        withInput: true,
      });

      document.body.appendChild(editableElement);
      EditableHook.mounted.call({ el: editableElement });

      const editor = await waitForTestEditor();

      expect(editor.getData({ rootName: 'foo' })).toBe(initialValue);
    });

    it('should sync editor data with a hidden input', async () => {
      const initialValue = '<p>Initial content</p>';
      const editableElement = createEditableHtmlElement({
        initialValue,
        name: 'second',
        withInput: true,
      });

      document.body.appendChild(editableElement);
      EditableHook.mounted.call({ el: editableElement });

      const editor = await waitForTestEditor();
      const input = editableElement.querySelector<HTMLInputElement>(`#${editableElement.id}_input`);

      editor.setData({ second: '<p>Updated content</p>' });

      // Test if sync is debounced
      expect(input!.value).toBe(initialValue);

      vi.runAllTimers();

      expect(input!.value).toBe('<p>Updated content</p>');
    });
  });

  describe('destroy', () => {
    it('should remove the editable root from the editor', async () => {
      const editor = await appendMultirootEditor();
      const editable = createEditableHtmlElement({
        name: 'foo',
        initialValue: '<p>Foo</p>',
      });

      document.body.appendChild(editable);
      EditableHook.mounted.call({ el: editable });

      expect(editor.getData({ rootName: 'foo' })).toBe('<p>Foo</p>');
      expect(editor.model.document.getRoot('foo')?.isAttached()).toBe(true);

      EditableHook.destroyed.call({ el: editable });

      await vi.waitFor(() => {
        expect(editor.model.document.getRoot('foo')?.isAttached()).toBe(false);
      });
    });

    it('should hide the element during destruction to prevent flickering', async () => {
      await appendMultirootEditor();

      const editable = createEditableHtmlElement({
        name: 'foo',
        initialValue: '<p>Foo</p>',
      });

      document.body.appendChild(editable);
      EditableHook.mounted.call({ el: editable });

      expect(editable.style.display).toBe('');

      EditableHook.destroyed.call({ el: editable });

      expect(editable.style.display).toBe('none');
    });
  });
});

async function appendMultirootEditor() {
  const hookElement = createEditorHtmlElement({
    preset: createEditorPreset('multiroot'),
  });

  document.body.appendChild(hookElement);
  EditorHook.mounted.call({ el: hookElement });

  const editor = await waitForTestEditor<MultiRootEditor>();

  expect(editor).toBeInstanceOf(MultiRootEditor);

  return editor;
}
