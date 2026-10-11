import type { Context } from 'ckeditor5';

import { ClassHook, isEmptyObject, makeHook } from '../../shared';
import {
  loadAllEditorTranslations,
  loadEditorPlugins,
  normalizeCustomTranslations,
  resolveEditorConfigElementReferences,
  resolveEditorConfigTranslations,
} from '../editor/utils';
import { ContextsRegistry } from './contexts-registry';
import { readContextConfigOrThrow } from './utils';

/**
 * Context hook for Phoenix LiveView. It allows you to create contexts for collaboration editors.
 */
class ContextHookImpl extends ClassHook {
  /**
   * The promise that resolves to the context instance.
   */
  private contextPromise: Promise<Context> | null = null;

  /**
   * Attributes for the context instance.
   */
  private get attrs() {
    const get = (attr: string) => this.el.getAttribute(attr) || null;
    const value = {
      id: this.el.id,
      config: readContextConfigOrThrow(this.el),
      language: {
        ui: get('data-cke-language') || 'en',
        content: get('data-cke-content-language') || 'en',
      },
    };

    Object.defineProperty(this, 'attrs', {
      value,
      writable: false,
      configurable: false,
      enumerable: true,
    });

    return value;
  }

  /**
   * Mounts the context component.
   */
  override async mounted() {
    // Read ID directly, because `this.attrs` getter may throw (invalid config) and it must be handled below.
    const id = this.el.id;

    ContextsRegistry.the.resetErrors(id);

    // Assign the promise synchronously, so `destroyed()` always has something to destroy,
    // even if the hook is destroyed while plugins or translations are still loading.
    this.contextPromise = this.createContext();

    try {
      const context = await this.contextPromise;
      const { onEditorError } = await import('ckeditor5');

      if (this.isBeingDestroyed()) {
        return;
      }

      const offEditorError = onEditorError(({ error, source }) => {
        if (source !== context) {
          return;
        }

        console.error(`Context "${id}" failed.`, error);

        for (const editor of context.editors) {
          editor.enableReadOnlyMode('error-handling');
        }
      });

      this.onBeforeDestroy(() => {
        offEditorError();
        ContextsRegistry.the.markAsDestroying(context);
        ContextsRegistry.the.unregister(id);
      });

      ContextsRegistry.the.register(id, context);
    }
    catch (error: any) {
      // Without this, editors waiting for this context would hang forever.
      console.error(error);
      ContextsRegistry.the.error(id, error);
    }
  }

  /**
   * Destroys the context component.
   */
  override async destroyed() {
    // Let's hide the element during destruction to prevent flickering.
    this.el.style.display = 'none';

    try {
      // Wait for the creation to finish before destroying. Creation errors are already reported in `mounted()`.
      const context = await this.contextPromise?.catch(() => null);

      await context?.destroy();
    }
    finally {
      this.contextPromise = null;
    }
  }

  /**
   * Loads plugins and translations and creates the context instance.
   */
  private async createContext(): Promise<Context> {
    const { language } = this.attrs;
    const { customTranslations, config: { plugins, ...config } } = this.attrs.config;
    const { loadedPlugins, hasPremium } = await loadEditorPlugins(plugins ?? []);

    // Mix custom translations with loaded translations.
    const loadedTranslations = await loadAllEditorTranslations(language, hasPremium);
    const mixedTranslations = [
      ...loadedTranslations,
      normalizeCustomTranslations(customTranslations?.dictionary || {}),
    ]
      .filter(translations => !isEmptyObject(translations));

    // Construct parsed config. First resolve DOM element references in the provided configuration.
    let resolvedConfig = resolveEditorConfigElementReferences(config);

    // Then resolve translation references in the provided configuration, using the mixed translations.
    resolvedConfig = resolveEditorConfigTranslations([...mixedTranslations].reverse(), language.ui, resolvedConfig);

    const { Context } = await import('ckeditor5');

    return Context.create({
      ...resolvedConfig,
      language,
      plugins: loadedPlugins,
      ...mixedTranslations.length && {
        translations: mixedTranslations,
      },
    });
  }
}

/**
 * Type guard to check if an element is a context hook HTMLElement.
 */
function isContextHookHTMLElement(el: HTMLElement): el is HTMLElement & { instance: ContextHookImpl; } {
  return el.hasAttribute('data-cke-context');
}

/**
 * Gets the nearest context hook parent element.
 */
function getNearestContextParent(el: HTMLElement) {
  let parent: HTMLElement | null = el;

  while (parent) {
    if (isContextHookHTMLElement(parent)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

/**
 * Gets the nearest context parent element as a promise.
 */
export async function getNearestContextParentPromise(el: HTMLElement): Promise<Context | null> {
  const parent = getNearestContextParent(el);

  if (!parent) {
    return null;
  }

  return ContextsRegistry.the.waitFor(parent.id);
}

/**
 * Phoenix LiveView hook for CKEditor 5 context elements.
 */
export const ContextHook = makeHook(ContextHookImpl);
