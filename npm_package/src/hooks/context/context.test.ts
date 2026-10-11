import { CKEditorError, Context, ContextPlugin, Plugin } from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createContextHtmlElement,
  createEditorHtmlElement,
  waitForTestContext,
  waitForTestEditor,
} from '~/test-utils/editor';

import { EditorHook, EditorsRegistry } from '../editor';
import { CustomEditorPluginsRegistry } from '../editor/custom-editor-plugins';
import { ContextHook, getNearestContextParentPromise } from './context';
import { ContextsRegistry } from './contexts-registry';

describe('context hook', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await ContextsRegistry.the.reset();
    CustomEditorPluginsRegistry.the.unregisterAll();
    vi.restoreAllMocks();
  });

  describe('mount', () => {
    it('should save the context instance in the registry with provided id', async () => {
      const hookElement = createContextHtmlElement({ id: 'magic-context' });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      expect(await waitForTestContext('magic-context')).toBeInstanceOf(Context);
    });

    it('should allow to use custom plugins', async () => {
      class MyCustomPlugin extends ContextPlugin {
        static pluginName = 'MyCustomPlugin';
      }

      CustomEditorPluginsRegistry.the.register('MyCustomPlugin', () => MyCustomPlugin);

      const hookElement = createContextHtmlElement({
        config: {
          config: {
            plugins: ['MyCustomPlugin'],
          },
        },
      });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const context = await waitForTestContext();

      expect(context).toBeDefined();
      expect(context.plugins.get('MyCustomPlugin')).toBeInstanceOf(MyCustomPlugin);
    });
  });

  describe('mount errors', () => {
    // A regular editor plugin is rejected by `Context.create()`, which gives a real creation failure.
    class NotAContextPlugin extends Plugin {
      static pluginName = 'NotAContextPlugin';
    }

    const createBrokenContextHtmlElement = () => createContextHtmlElement({
      id: 'broken-context',
      config: {
        config: {
          plugins: ['NotAContextPlugin'],
        },
      },
    });

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      CustomEditorPluginsRegistry.the.register('NotAContextPlugin', () => NotAContextPlugin);
    });

    afterEach(() => {
      // Errors are not cleared by `reset()`. Clearing them also clears the default (`null`) error,
      // so they do not leak into tests that wait for the default context or editor.
      ContextsRegistry.the.resetErrors('broken-context');
      EditorsRegistry.the.resetErrors('editor-in-broken-context');
    });

    it('should register the error if the context cannot be created', async () => {
      const hookElement = createBrokenContextHtmlElement();

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      await expect(ContextsRegistry.the.waitFor('broken-context')).rejects.toThrow('context-initplugins-invalid-plugin');

      expect(ContextsRegistry.the.hasItem('broken-context')).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should reject editors waiting for the context that cannot be created', async () => {
      const contextHookElement = createBrokenContextHtmlElement();
      const editorHookElement = createEditorHtmlElement({ id: 'editor-in-broken-context' });

      contextHookElement.appendChild(editorHookElement);
      document.body.appendChild(contextHookElement);

      ContextHook.mounted.call({ el: contextHookElement });
      EditorHook.mounted.call({ el: editorHookElement });

      await expect(EditorsRegistry.the.waitFor('editor-in-broken-context')).rejects.toThrow('context-initplugins-invalid-plugin');
    });

    it('should not fail when destroying the hook of the context that could not be created', async () => {
      const hookElement = createBrokenContextHtmlElement();

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      await expect(ContextsRegistry.the.waitFor('broken-context')).rejects.toThrow();

      // Rejects (and fails the test) if the creation error is not swallowed in `destroyed()`.
      await ContextHook.destroyed.call({ el: hookElement });

      expect(ContextsRegistry.the.hasItem('broken-context')).toBe(false);
    });

    it('should reset the previous error when mounted again', async () => {
      const brokenHookElement = createBrokenContextHtmlElement();

      document.body.appendChild(brokenHookElement);
      ContextHook.mounted.call({ el: brokenHookElement });

      await expect(ContextsRegistry.the.waitFor('broken-context')).rejects.toThrow();
      await ContextHook.destroyed.call({ el: brokenHookElement });
      brokenHookElement.remove();

      const fixedHookElement = createContextHtmlElement({ id: 'broken-context' });

      document.body.appendChild(fixedHookElement);
      ContextHook.mounted.call({ el: fixedHookElement });

      // Called before the context is created, so it would reject immediately with the previous error
      // if `mounted()` did not reset it.
      expect(await ContextsRegistry.the.waitFor('broken-context')).toBeInstanceOf(Context);
    });
  });

  describe('destroy', () => {
    it('should destroy and unregister context if hook is destroyed', async () => {
      const hookElement = createContextHtmlElement({ id: 'destroyed-context' });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      await waitForTestContext('destroyed-context');

      ContextHook.destroyed.call({ el: hookElement });

      await vi.waitFor(() => {
        expect(ContextsRegistry.the.hasItem('destroyed-context')).toBe(false);
      });
    });

    it('should unregister and mark the context as destroying synchronously when destruction starts', async () => {
      const destroySpy = vi.spyOn(Context.prototype, 'destroy');
      const hookElement = createContextHtmlElement({ id: 'sync-destroyed-context' });

      document.body.appendChild(hookElement);
      ContextHook.mounted.call({ el: hookElement });

      const context = await waitForTestContext('sync-destroyed-context');

      ContextHook.destroyed.call({ el: hookElement });

      // Checked without awaiting anything: editor hooks destroyed in the same patch rely on it.
      expect(ContextsRegistry.the.hasItem('sync-destroyed-context')).toBe(false);
      expect(ContextsRegistry.the.isDestroying(context)).toBe(true);

      await vi.waitFor(() => {
        expect(destroySpy).toHaveBeenCalledTimes(1);
      });
    });

    it('should not unregister the context of a new hook with the same id when the old one finishes destroying', async () => {
      const originalDestroy = Context.prototype.destroy;
      let releaseDestroy!: () => void;
      const destroyGate = new Promise<void>((resolve) => {
        releaseDestroy = resolve;
      });

      // Block destruction of the old context until the new one is registered.
      vi.spyOn(Context.prototype, 'destroy').mockImplementationOnce(async function (this: Context) {
        await destroyGate;

        return originalDestroy.call(this);
      });

      const oldHookElement = createContextHtmlElement({ id: 'replaced-context' });

      document.body.appendChild(oldHookElement);
      ContextHook.mounted.call({ el: oldHookElement });

      const oldContext = await waitForTestContext('replaced-context');
      const oldDestroying = ContextHook.destroyed.call({ el: oldHookElement });

      // Simulate LiveView replacing the element with a new one with the same id.
      oldHookElement.remove();

      const newHookElement = createContextHtmlElement({ id: 'replaced-context' });

      document.body.appendChild(newHookElement);
      ContextHook.mounted.call({ el: newHookElement });

      const newContext = await ContextsRegistry.the.waitFor('replaced-context');

      expect(newContext).not.toBe(oldContext);

      releaseDestroy();
      await oldDestroying;
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ContextsRegistry.the.getItem('replaced-context')).toBe(newContext);
    });

    it('should destroy the context and skip registration if hook is destroyed during creation', async () => {
      const destroySpy = vi.spyOn(Context.prototype, 'destroy');
      const registerSpy = vi.spyOn(ContextsRegistry.the, 'register');
      const hookElement = createContextHtmlElement({ id: 'short-lived-context' });

      document.body.appendChild(hookElement);

      ContextHook.mounted.call({ el: hookElement });
      ContextHook.destroyed.call({ el: hookElement });

      await vi.waitFor(() => {
        expect(destroySpy).toHaveBeenCalledTimes(1);
      });

      // Let `mounted()` finish after the context was created.
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(registerSpy).not.toHaveBeenCalled();
      expect(ContextsRegistry.the.hasItem('short-lived-context')).toBe(false);
    });
  });

  describe('errors of the running context', () => {
    /**
     * Reports an error attributed to the context the same way the browser does for an uncaught error.
     */
    const reportContextError = (context: Context) => {
      const error = new CKEditorError('test-context-error', context);

      window.dispatchEvent(new ErrorEvent('error', { error }));

      return error;
    };

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should log the error and switch editors of the context to read-only mode', async () => {
      const contextHookElement = createContextHtmlElement({ id: 'failing-context' });
      const editorHookElement = createEditorHtmlElement({ id: 'failing-context-editor' });

      contextHookElement.appendChild(editorHookElement);
      document.body.appendChild(contextHookElement);

      ContextHook.mounted.call({ el: contextHookElement });
      EditorHook.mounted.call({ el: editorHookElement });

      const context = await waitForTestContext('failing-context');
      const editor = await waitForTestEditor('failing-context-editor');

      expect(editor.isReadOnly).toBe(false);

      const error = reportContextError(context);

      expect(console.error).toHaveBeenCalledWith('Context "failing-context" failed.', error);
      expect(editor.isReadOnly).toBe(true);
    });

    it('should ignore errors attributed to other contexts', async () => {
      const healthyContextHookElement = createContextHtmlElement({ id: 'healthy-context' });
      const healthyEditorHookElement = createEditorHtmlElement({ id: 'healthy-context-editor' });
      const failingContextHookElement = createContextHtmlElement({ id: 'other-failing-context' });

      healthyContextHookElement.appendChild(healthyEditorHookElement);
      document.body.appendChild(healthyContextHookElement);
      document.body.appendChild(failingContextHookElement);

      ContextHook.mounted.call({ el: healthyContextHookElement });
      ContextHook.mounted.call({ el: failingContextHookElement });
      EditorHook.mounted.call({ el: healthyEditorHookElement });

      await waitForTestContext('healthy-context');
      const failingContext = await waitForTestContext('other-failing-context');
      const healthyEditor = await waitForTestEditor('healthy-context-editor');

      reportContextError(failingContext);

      expect(console.error).toHaveBeenCalledWith('Context "other-failing-context" failed.', expect.anything());
      expect(console.error).not.toHaveBeenCalledWith('Context "healthy-context" failed.', expect.anything());
      expect(healthyEditor.isReadOnly).toBe(false);
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

      const context = await waitForTestContext();
      const configLanguage = context?.config.get('language') as any;

      expect(configLanguage).toBeDefined();
      expect(configLanguage?.ui).toBe('pl');
      expect(configLanguage?.content).toBe('de');
    });

    it('should use default language if not set', async () => {
      const hookElement = createContextHtmlElement({
        config: {
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

      const context = await waitForTestContext();
      const configLanguage = context?.config.get('language') as any;

      expect(configLanguage).toBeDefined();
      expect(configLanguage?.ui).toBe('en');
      expect(configLanguage?.content).toBe('en');
    });

    it('should pass custom translations to the editor', async () => {
      const hookElement = createContextHtmlElement({
        config: {
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

      const context = await waitForTestContext();
      const translation = context?.t('Bold');

      expect(translation).toBe('Custom Pogrubienie');
    });

    it('should pass translation references to the context', async () => {
      const hookElement = createContextHtmlElement({
        config: {
          config: {
            customPlugin: { $translation: 'CustomPlugin' },
            plugins: [],
          },
          customTranslations: {
            dictionary: {
              en: { CustomPlugin: 'Custom Bold' },
              pl: { CustomPlugin: 'Custom Plugin' },
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

      const context = await waitForTestContext();
      const translation = context?.config.get('customPlugin');

      expect(translation).toBe('Custom Plugin');
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

      const context = await waitForTestContext();
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

      const context = await waitForTestContext('second-magic-context');
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

      const context = await waitForTestContext('destroyed-context');
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

      const context = await waitForTestContext('destroyed-context');
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

  describe('getNearestContextParentPromise', () => {
    it('should resolve to `null` if the element is not placed within a context element', async () => {
      const element = document.createElement('div');

      document.body.appendChild(element);

      expect(await getNearestContextParentPromise(element)).toBeNull();
    });
  });
});
