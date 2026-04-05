import type { Editor, PluginConstructor } from 'ckeditor5';

import type { EditorId } from '../typings';

import { debounce, isNil, shallowEqual } from '../../../shared';

const SUPPRESS_PHOENIX_SYNC_KEY = Symbol('suppress-phoenix-sync');

/**
 * Creates a SyncEditorWithPhoenix plugin class. It's not two way binding, but
 * it allows you to push editor data to Phoenix on change, focus and blur events, and
 * also to set editor data from Phoenix.
 *
 * In order to debug two-way binding, check `EditorRootValueSentinel` component, which is used
 * to assign the value to the editor based on modification of the Elixir component's assigns.
 *
 * @param options The options for the plugin, including editorId, debounce time, events to listen to, and pushEvent/handleEvent functions.
 * @returns A Promise that resolves to the SyncEditorWithPhoenix plugin constructor.
 */
export async function createSyncEditorWithPhoenixPlugin(options: Attrs): Promise<PluginConstructor> {
  const { Plugin } = await import('ckeditor5');
  const { editorId, saveDebounceMs, events, pushEvent, handleEvent } = options;

  return class SyncEditorWithPhoenix extends Plugin {
    /**
     * The name of the plugin.
     */
    static get pluginName() {
      return 'SyncEditorWithPhoenix' as const;
    }

    /**
     * Initializes the plugin.
     */
    public init(): void {
      const { editor } = this;

      if (events.change) {
        this.setupTypingContentPush();
      }

      if (events.blur) {
        this.setupEventPush('blur');
      }

      if (events.focus) {
        this.setupEventPush('focus');
      }

      if (events.ready) {
        this.editor.once('ready', () => {
          pushEvent('ckeditor5:ready', {
            editorId,
            data: getEditorRootsValues(editor),
          });
        });
      }

      handleEvent('ckeditor5:set-data', ({ editorId: targetId, data }) => {
        if (isNil(targetId) || targetId === editorId) {
          editor.setData(data);
        }
      });
    }

    /**
     * Setups the content push event for the editor.
     */
    private setupTypingContentPush() {
      const { editor } = this;

      let lastValue: Record<string, string> | null = null;
      let isDestroyed = false;

      const pushContentChange = () => {
        if (isDestroyed) {
          return;
        }

        const newValue = getEditorRootsValues(editor);

        if (!lastValue || !shallowEqual(lastValue, newValue)) {
          pushEvent(
            'ckeditor5:change',
            {
              editorId,
              data: newValue,
            },
          );

          lastValue = newValue;
        }
      };

      const debouncedPushContentChange = debounce(saveDebounceMs, pushContentChange);

      editor.model.document.on('change:data', debounce(10, (evt) => {
        /* v8 ignore next 4 */
        if (releasePhoenixSyncSuppressLock(evt)) {
          lastValue = null;
          return;
        }

        if (editor.ui.focusTracker.isFocused) {
          debouncedPushContentChange();
        }
        else {
          pushContentChange();
        }
      }));

      editor.once('ready', pushContentChange);
      editor.once('destroy', () => {
        isDestroyed = true;
      });
    }

    /**
     * Setups the event push for the editor.
     */
    private setupEventPush(eventType: 'focus' | 'blur') {
      const { editor } = this;

      const pushEventCallback = () => {
        const { isFocused } = editor.ui.focusTracker;
        const currentType = isFocused ? 'focus' : 'blur';

        if (currentType !== eventType) {
          return;
        }

        pushEvent(
          `ckeditor5:${eventType}`,
          {
            editorId,
            data: getEditorRootsValues(editor),
          },
        );
      };

      editor.ui.focusTracker.on('change:isFocused', pushEventCallback);
    }
  };
}

type Attrs = {
  editorId: EditorId;
  saveDebounceMs: number;
  events: {
    change: boolean;
    focus: boolean;
    blur: boolean;
    ready: boolean;
  };
  pushEvent: (event: string, payload: any) => void;
  handleEvent: (event: string, callback: (payload: any) => void) => void;
};

/**
 * Gets the values of the editor's roots.
 *
 * @param editor The CKEditor instance.
 * @returns An object mapping root names to their content.
 */
function getEditorRootsValues(editor: Editor) {
  const roots = editor.model.document.getRootNames();

  return roots.reduce<Record<string, string>>((acc, rootName) => {
    acc[rootName] = editor.getData({ rootName });
    return acc;
  }, Object.create({}));
}

/**
 * Drops lock that informs plugin that data should not be synced with Phoenix.
 *
 * @param evt Event instance.
 * @returns `true` if event suppressed phoenix lock.
 */
function releasePhoenixSyncSuppressLock(evt: any) {
  const lock = evt[SUPPRESS_PHOENIX_SYNC_KEY];

  delete evt[SUPPRESS_PHOENIX_SYNC_KEY];

  return !!lock;
}

/**
 * Marks pending `change:data` as non-syncable with Phoenix.
 *
 * @param editor Editor instance.
 */
export function skipPendingPhoenixDataChangeSync(editor: Editor) {
  let ignore = false;

  const callback = (evt: any) => {
    if (!ignore) {
      evt[SUPPRESS_PHOENIX_SYNC_KEY] = true;
    }
  };

  editor.model.document.once('change:data', callback, { priority: 'highest' });

  return () => {
    ignore = true;
    editor.model.document.off('change:data', callback);
  };
}
