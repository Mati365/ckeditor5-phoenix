import type { Editor, PluginConstructor } from 'ckeditor5';

import type { EditorId } from '../typings';

import { debounce, isNil } from '../../../shared';

/**
 * Creates a SyncEditorWithPhoenix plugin class.
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

      const pushContentChange = () => {
        pushEvent(
          'ckeditor5:change',
          {
            editorId,
            data: getEditorRootsValues(this.editor),
          },
        );
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
