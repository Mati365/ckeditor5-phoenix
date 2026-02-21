import { ContextPlugin, ContextWatchdog } from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createContextHtmlElement,
  createEditorHtmlElement,
  waitForTestContext,
  waitForTestEditor,
} from '~/test-utils/editor';

import { EditorHook, EditorsRegistry } from '../editor';
import { CustomEditorPluginsRegistry } from '../editor/custom-editor-plugins';
import { ContextHook } from './context';
import { ContextsRegistry } from './contexts-registry';

describe('context hook', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await ContextsRegistry.the.destroyAll();
    CustomEditorPluginsRegistry.the.unregisterAll();
  });

  describe('mount', () => {
    it('should save the context instance in the registry with provided id', async () => {
      const hookElement = createContextHtmlElement({ id: 'magic-context' });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      expect(await waitForTestContext('magic-context')).toBeInstanceOf(ContextWatchdog);
    });

    it('should print console error if `itemError` is fired', async () => {
      const hookElement = createContextHtmlElement({ id: 'error-context' });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const context = await waitForTestContext('error-context');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (context as any)._fire('itemError', 'Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Context item error:', null, 'Test error');
      consoleErrorSpy.mockRestore();
    });

    it('should allow to use custom plugins', async () => {
      class MyCustomPlugin extends ContextPlugin {
        static pluginName = 'MyCustomPlugin';
      }

      CustomEditorPluginsRegistry.the.register('MyCustomPlugin', () => MyCustomPlugin);

      const hookElement = createContextHtmlElement({
        config: {
          watchdogConfig: {},
          config: {
            plugins: ['MyCustomPlugin'],
          },
        },
      });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const context = await waitForTestContext();

      expect(context).toBeDefined();
      expect(context.context?.plugins.get('MyCustomPlugin')).toBeInstanceOf(MyCustomPlugin);
    });
  });

  describe('destroy', () => {
    it('should destroy and unregister context if hook is destroyed', async () => {
      const hookElement = createContextHtmlElement({ id: 'destroyed-context' });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const contextWatchdog = await waitForTestContext('destroyed-context');

      ContextHook.destroyed.call({ el: hookElement });

      await vi.waitFor(() => {
        expect(contextWatchdog.state).toEqual('destroyed');
        expect(ContextsRegistry.the.hasItem('destroyed-context')).toBe(false);
      });
    });
  });

  describe('`cke-language` and `cke-content-language` options', () => {
    it('should pass the correct language to the editor (ui and content)', async () => {
      const hookElement = createContextHtmlElement({
        language: { ui: 'pl', content: 'de' },
      });

      hookElement.setAttribute('data-cke-language', 'pl');
      hookElement.setAttribute('data-cke-content-language', 'de');

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const { context } = await waitForTestContext();
      const configLanguage = context?.config.get('language') as any;

      expect(configLanguage).toBeDefined();
      expect(configLanguage?.ui).toBe('pl');
      expect(configLanguage?.content).toBe('de');
    });

    it('should use default language if not set', async () => {
      const hookElement = createContextHtmlElement({
        config: {
          watchdogConfig: {},
          config: { plugins: [] },
          customTranslations: {
            dictionary: {
              pl: { Bold: 'Custom Pogrubienie' },
            },
          },
        },
      });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const { context } = await waitForTestContext();
      const configLanguage = context?.config.get('language') as any;

      expect(configLanguage).toBeDefined();
      expect(configLanguage?.ui).toBe('en');
      expect(configLanguage?.content).toBe('en');
    });

    it('should pass custom translations to the editor', async () => {
      const hookElement = createContextHtmlElement({
        config: {
          watchdogConfig: {},
          config: { plugins: [] },
          customTranslations: {
            dictionary: {
              pl: { Bold: 'Custom Pogrubienie' },
            },
          },
        },
        language: {
          ui: 'pl',
          content: 'pl',
        },
      });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const { context } = await waitForTestContext();
      const translation = context?.t('Bold');

      expect(translation).toBe('Custom Pogrubienie');
    });
  });

  describe('attaching editor', () => {
    it('should attach editor without specified `data-cke-context-id` if placed within context element', async () => {
      const contextHookElement = createContextHtmlElement();
      const editorHookElement = createEditorHtmlElement();

      contextHookElement.appendChild(editorHookElement);
      document.body.appendChild(contextHookElement);

      ContextHook.mounted.call({ el: contextHookElement });
      EditorHook.mounted.call({ el: editorHookElement });

      const { context } = await waitForTestContext();
      const editor = await waitForTestEditor();

      expect(context).toBeDefined();
      expect(editor).toBeDefined();

      expect(context?.editors.first).toEqual(editor);
    });

    it('should attach editor with specified via `data-cke-context-id` to different context if placed within context element', async () => {
      const firstContextHookElement = createContextHtmlElement({ id: 'first-magic-context' });
      const secondContextHookElement = createContextHtmlElement({ id: 'second-magic-context' });
      const editorHookElement = createEditorHtmlElement({ contextId: 'second-magic-context' });

      firstContextHookElement.appendChild(editorHookElement);
      document.body.appendChild(firstContextHookElement);
      document.body.appendChild(secondContextHookElement);

      ContextHook.mounted.call({ el: firstContextHookElement });
      ContextHook.mounted.call({ el: secondContextHookElement });
      EditorHook.mounted.call({ el: editorHookElement });

      const { context } = await waitForTestContext('second-magic-context');
      const editor = await waitForTestEditor();

      expect(context).toBeDefined();
      expect(editor).toBeDefined();

      expect(context?.editors.first).toEqual(editor);
    });

    it('destroying editor within context will remove it from context', async () => {
      const contextHookElement = createContextHtmlElement({ id: 'destroyed-context' });
      const editorHookElement = createEditorHtmlElement();

      contextHookElement.appendChild(editorHookElement);
      document.body.appendChild(contextHookElement);

      ContextHook.mounted.call({ el: contextHookElement });
      EditorHook.mounted.call({ el: editorHookElement });

      const { context } = await waitForTestContext('destroyed-context');
      const editor = await waitForTestEditor();

      expect(context).toBeDefined();
      expect(editor).toBeDefined();
      expect(context?.editors.first).toEqual(editor);

      EditorHook.destroyed.call({ el: editorHookElement });

      await vi.waitFor(() => {
        expect(context?.editors.first).toBeNull();
      });
    });

    it('destroying context will destroy editor within context and deregister it', async () => {
      const contextHookElement = createContextHtmlElement({ id: 'destroyed-context' });
      const editorHookElement = createEditorHtmlElement({ id: 'context-editor' });

      contextHookElement.appendChild(editorHookElement);
      document.body.appendChild(contextHookElement);

      ContextHook.mounted.call({ el: contextHookElement });
      EditorHook.mounted.call({ el: editorHookElement });

      const { context } = await waitForTestContext('destroyed-context');
      const editor = await waitForTestEditor('context-editor');

      expect(context).toBeDefined();
      expect(editor).toBeDefined();
      expect(context?.editors.first).toEqual(editor);

      ContextHook.destroyed.call({ el: contextHookElement });

      await vi.waitFor(() => {
        expect(context?.editors.first).toBeNull();
        expect(ContextsRegistry.the.hasItem('destroyed-context')).toBe(false);
        expect(EditorsRegistry.the.hasItem('context-editor')).toBe(false);
      });
    });
  });
});
