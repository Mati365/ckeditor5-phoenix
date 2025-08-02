import {
  ClassicEditor,
  DecoupledEditor,
  InlineEditor,
  MultiRootEditor,
} from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditableHtmlElement,
  createEditorHtmlElement,
  createEditorPreset,
  getTestEditorInput,
  isEditorShown,
  waitForTestEditor,
} from '~/test-utils';

import { EditorHook } from './editor';
import { EditorsRegistry } from './editors-registry';

describe('editor hook', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await EditorsRegistry.the.destroyAllEditors();
  });

  describe('mount', () => {
    it('should save the editor instance in the registry with provided editorId', async () => {
      const hookElement = createEditorHtmlElement({
        id: 'magic-editor',
      });

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      expect(
        await EditorsRegistry.the.waitForEditor('magic-editor'),
      ).toBeInstanceOf(ClassicEditor);
    });

    describe('classic', () => {
      it('should create an classic editor with default preset', async () => {
        const hookElement = createEditorHtmlElement();

        document.body.appendChild(hookElement);
        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).to.toBeInstanceOf(ClassicEditor);
        expect(isEditorShown()).toBe(true);
      });

      it('should assign default value to the editor using "cke-initial-value" attribute', async () => {
        const initialValue = `<p>Hello World! Today is ${new Date().toLocaleDateString()}</p>`;
        const hookElement = createEditorHtmlElement({
          initialValue,
        });

        document.body.appendChild(hookElement);
        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor.getData()).toBe(initialValue);
      });

      it('should create an editor even if `cke-initial-value` is not set', async () => {
        const hookElement = createEditorHtmlElement({
          initialValue: null,
        });

        document.body.appendChild(hookElement);
        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(ClassicEditor);
        expect(editor.getData()).toBe('');

        expect(isEditorShown()).toBe(true);
      });
    });

    describe('decoupled', () => {
      it('should be possible to create decoupled editor with editable (without initial value)', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('decoupled'),
        });

        document.body.appendChild(hookElement);
        document.body.appendChild(createEditableHtmlElement());

        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(DecoupledEditor);
        expect(editor.getData()).toBe('<p>Test content</p>');

        expect(isEditorShown()).toBe(true);
      });

      it('should be possible to create decoupled editor with editable (with initial value)', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('decoupled'),
        });

        document.body.appendChild(hookElement);
        document.body.appendChild(
          createEditableHtmlElement({
            initialValue: '<p>Editable initial value</p>',
          }),
        );

        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(DecoupledEditor);
        expect(editor.getData()).toBe('<p>Editable initial value</p>');

        expect(isEditorShown()).toBe(true);
      });

      it('should raise exception if `main` editable is not present', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('decoupled'),
          initialValue: null,
        });

        document.body.appendChild(hookElement);

        await expect(() =>
          EditorHook.mounted.call({ el: hookElement }),
        ).rejects.toThrow(/No "main" editable found for editor with ID/);
      });

      it('if the initial value is specified on the editable, it should ignore initial value set on the editor', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('decoupled'),
          initialValue: '<p>Ignored content</p>',
        });

        document.body.appendChild(hookElement);
        document.body.appendChild(
          createEditableHtmlElement({
            initialValue: '<p>Editable value</p>',
          }),
        );

        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(DecoupledEditor);
        expect(editor.getData()).toBe('<p>Editable value</p>');

        expect(isEditorShown()).toBe(true);
      });

      it('should not match editables form the other editors', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('decoupled'),
          initialValue: null,
        });

        const editables = {
          current: createEditableHtmlElement({
            id: 'test-editor',
            initialValue: '<p>XD</p>',
          }),
          other: createEditableHtmlElement({
            id: 'other-editor',
            name: 'main',
            initialValue: '<p>Other content</p>',
            editorId: 'other-editor-1',
          }),
          other1: createEditableHtmlElement({
            id: 'other-editor-1',
            name: 'main',
            initialValue: '<p>Other content 1</p>',
            editorId: 'other-editor-1',
          }),
        };

        document.body.appendChild(hookElement);
        document.body.appendChild(editables.other1);
        document.body.appendChild(editables.current);
        document.body.appendChild(editables.other);

        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(DecoupledEditor);
        expect(editor.getData()).toBe('<p>XD</p>');
      });
    });

    describe('inline', () => {
      it('should create an inline editor with default preset', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('inline'),
        });

        document.body.appendChild(hookElement);
        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(InlineEditor);
        expect(isEditorShown()).toBe(true);
      });
    });

    describe('multiroot', () => {
      it('should create a multiroot editor without editables', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('multiroot'),
        });

        document.body.appendChild(hookElement);
        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(MultiRootEditor);
      });

      it('should create a multiroot editor with editables', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('multiroot'),
        });

        document.body.appendChild(hookElement);
        document.body.appendChild(
          createEditableHtmlElement({
            name: 'main',
            initialValue: '<p>Main root</p>',
          }),
        );

        document.body.appendChild(
          createEditableHtmlElement({
            name: 'second',
            initialValue: '<p>Second root</p>',
          }),
        );

        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();

        expect(editor).toBeInstanceOf(MultiRootEditor);
        expect(editor.getData({ rootName: 'main' })).toBe('<p>Main root</p>');
        expect(editor.getData({ rootName: 'second' })).toBe(
          '<p>Second root</p>',
        );
      });
    });

    describe('custom translations', () => {
      it('should pass custom translations to the editor', async () => {
        const hookElement = createEditorHtmlElement({
          preset: createEditorPreset('classic', {}, {
            pl: { Bold: 'Custom Pogrubienie' },
          }),
          language: {
            ui: 'pl',
            content: 'pl',
          },
        });

        document.body.appendChild(hookElement);
        EditorHook.mounted.call({ el: hookElement });

        const editor = await waitForTestEditor();
        const translation = editor.locale.t('Bold');

        expect(translation).toBe('Custom Pogrubienie');
      });
    });
  });

  describe('destroy', () => {
    it('should destroy editor on hook destruction', async () => {
      const hookElement = createEditorHtmlElement();

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      const editor = await waitForTestEditor();

      EditorHook.destroyed.call({ el: hookElement });

      expect(EditorsRegistry.the.getEditors()).toContain(editor);

      await new Promise((resolve) => {
        editor.once('destroy', resolve);
        editor.destroy();
      });

      expect(EditorsRegistry.the.getEditors()).not.toContain(editor);
    });

    it('should mark the element as hidden during destruction', async () => {
      const hookElement = createEditorHtmlElement();

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      await waitForTestEditor();

      expect(hookElement.style.display).toBe('');

      EditorHook.destroyed.call({ el: hookElement });

      expect(hookElement.style.display).toBe('none');
    });
  });

  describe('value synchronization', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should sync editor data with the input on parent form submit', async () => {
      const initialValue = `<p>Initial content</p>`;
      const hookElement = createEditorHtmlElement({
        initialValue,
        withInput: true,
      });

      // Create a form and append the editor element to it
      const form = document.createElement('form');
      form.appendChild(hookElement);
      document.body.appendChild(form);

      EditorHook.mounted.call({ el: hookElement });
      await waitForTestEditor();

      const input = getTestEditorInput();
      expect(input.value).toBe(initialValue);

      // Change editor data
      const newValue = '<p>Changed by user</p>';
      const editor = await waitForTestEditor();
      editor.setData(newValue);

      // Input should not be updated yet (debounced)
      expect(input.value).toBe(initialValue);

      // Simulate form submit
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);

      // Now input should be synced immediately
      expect(input.value).toBe(newValue);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not crash if input is not present', async () => {
      const initialValue = `<p>Test content</p>`;
      const hookElement = createEditorHtmlElement({
        initialValue,
        withInput: false,
      });

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      await waitForTestEditor();
    });

    it('should initialize the input with the initial value', async () => {
      const initialValue = `<p>Test content</p>`;
      const hookElement = createEditorHtmlElement({
        initialValue,
        withInput: true,
      });

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      await waitForTestEditor();

      const input = getTestEditorInput();

      expect(input.value).toBe(initialValue);
    });

    it('should sync editor data with a hidden input', async () => {
      const initialValue = `<p>Initial content</p>`;
      const hookElement = createEditorHtmlElement({
        initialValue,
        withInput: true,
      });

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      const editor = await waitForTestEditor();
      const input = getTestEditorInput();

      editor.setData('<p>Updated content</p>');

      // Test if sync is debounced
      expect(input.value).toBe(initialValue);

      await vi.advanceTimersByTimeAsync(500);

      expect(input.value).toBe('<p>Updated content</p>');
    });

    it('should dispatch input event on sync', async () => {
      const initialValue = `<p>Initial content</p>`;
      const hookElement = createEditorHtmlElement({
        initialValue,
        withInput: true,
      });

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      const editor = await waitForTestEditor();
      const input = getTestEditorInput();
      const inputEventSpy = vi.fn();
      input.addEventListener('input', inputEventSpy);

      editor.setData('<p>Updated content</p>');
      await vi.advanceTimersByTimeAsync(500);

      expect(inputEventSpy).toHaveBeenCalled();
    });
  });

  describe('socket events', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should push event to the server after changing data when `push events` enabled', async () => {
      const hookElement = createEditorHtmlElement({
        changeEvent: true,
      });

      const pushSpy = vi.fn();

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({
        el: hookElement,
        pushEvent: pushSpy,
      });

      const editor = await waitForTestEditor();

      // First call after mount
      expect(pushSpy).toHaveBeenCalledTimes(1);
      expect(pushSpy).toHaveBeenCalledWith(
        'ckeditor5:change',
        {
          editorId: hookElement.id,
          data: {
            main: '<p>Test content</p>',
          },
        },
        undefined,
      );

      // Check if component responds to changes
      editor.setData('<p>New content</p>');

      await vi.advanceTimersByTimeAsync(500);

      expect(pushSpy).toHaveBeenCalledTimes(2);
      expect(pushSpy).toHaveBeenCalledWith(
        'ckeditor5:change',
        {
          editorId: hookElement.id,
          data: {
            main: '<p>New content</p>',
          },
        },
        undefined,
      );
    });

    it('should not push event to the server if `push events` is not enabled', async () => {
      const hookElement = createEditorHtmlElement();

      const pushSpy = vi.fn();

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({
        el: hookElement,
        pushEvent: pushSpy,
      });

      const editor = await waitForTestEditor();

      expect(pushSpy).not.toHaveBeenCalled();

      // Check if component responds to changes
      editor.setData('<p>New content</p>');

      await vi.advanceTimersByTimeAsync(500);

      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should handle incoming data from the server', async () => {
      const hookElement = createEditorHtmlElement({
        changeEvent: true,
      });

      const handleEventSpy = vi.fn();

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({
        el: hookElement,
        handleEvent: handleEventSpy,
      });

      const editor = await waitForTestEditor();

      // Simulate server event
      const dataFromServer = '<p>Content from server</p>';
      handleEventSpy.mock.calls[0]![1]({ data: { main: dataFromServer } });

      expect(editor.getData()).toBe(dataFromServer);
    });
  });

  describe('`cke-editable-height` attribute', () => {
    it('should set the height of the editable area', async () => {
      const editableHeight = 255;
      const hookElement = createEditorHtmlElement({
        editableHeight,
      });

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      const editor = await waitForTestEditor();
      const editable = editor.editing.view.document.getRoot('main');

      expect(editable?.getStyle('height')).toBe(`${editableHeight}px`);
    });
  });

  describe('`cke-save-debounce-ms` attribute', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use default debounce (400ms) for content push', async () => {
      const hookElement = createEditorHtmlElement({
        changeEvent: true,
      });

      document.body.appendChild(hookElement);

      const pushSpy = vi.fn();
      EditorHook.mounted.call({ el: hookElement, pushEvent: pushSpy });

      const editor = await waitForTestEditor();

      pushSpy.mockClear();
      editor.setData('<p>Debounce test</p>');

      await vi.advanceTimersByTimeAsync(399);
      expect(pushSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2);
      expect(pushSpy).toHaveBeenCalled();
    });

    it('should use custom debounce from cke-save-debounce-ms', async () => {
      const hookElement = createEditorHtmlElement({
        changeEvent: true,
        saveDebounceMs: 1000,
      });

      document.body.appendChild(hookElement);

      const pushSpy = vi.fn();
      EditorHook.mounted.call({ el: hookElement, pushEvent: pushSpy });

      const editor = await waitForTestEditor();
      pushSpy.mockClear();
      editor.setData('<p>Debounce test</p>');

      await vi.advanceTimersByTimeAsync(999);
      expect(pushSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2);
      expect(pushSpy).toHaveBeenCalled();
    });

    it('should use custom debounce for input sync', async () => {
      const hookElement = createEditorHtmlElement({
        initialValue: '<p>Initial</p>',
        withInput: true,
        saveDebounceMs: 700,
      });
      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });
      const editor = await waitForTestEditor();
      const input = getTestEditorInput();
      editor.setData('<p>Debounced input</p>');
      await vi.advanceTimersByTimeAsync(699);
      expect(input.value).not.toBe('<p>Debounced input</p>');
      await vi.advanceTimersByTimeAsync(2);
      expect(input.value).toBe('<p>Debounced input</p>');
    });
  });

  describe('`cke-language` and `cke-content-language` options', () => {
    it('should pass the correct language to the editor (ui and content)', async () => {
      const hookElement = createEditorHtmlElement({
        language: { ui: 'pl', content: 'de' },
      });

      hookElement.setAttribute('cke-language', 'pl');
      hookElement.setAttribute('cke-content-language', 'de');

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      const editor = await waitForTestEditor();
      const configLanguage = editor.config.get('language') as any;

      expect(configLanguage).toBeDefined();
      expect(configLanguage?.ui).toBe('pl');
      expect(configLanguage?.content).toBe('de');
    });

    it('should use default language if not set', async () => {
      const hookElement = createEditorHtmlElement();

      document.body.appendChild(hookElement);
      EditorHook.mounted.call({ el: hookElement });

      const editor = await waitForTestEditor();
      const configLanguage = editor.config.get('language') as any;

      expect(configLanguage).toBeDefined();
      expect(configLanguage?.ui).toBe('en');
      expect(configLanguage?.content).toBe('en');
    });
  });
});
