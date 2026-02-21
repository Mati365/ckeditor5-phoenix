import type { Editor, PluginConstructor } from 'ckeditor5';

import type { EditorId } from '../typings';

import { debounce, isNil, shallowEqual } from '../../../shared';

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

      const pushContentChange = () => {
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

      editor.model.document.on('change:data', debounce(saveDebounceMs, pushContentChange));
      editor.once('ready', pushContentChange);
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
