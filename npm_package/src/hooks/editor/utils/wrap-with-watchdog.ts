import type { Editor, EditorWatchdog, WatchdogConfig } from 'ckeditor5';

const EDITOR_WATCHDOG_SYMBOL = Symbol.for('elixir-editor-watchdog');

/**
 * Wraps an editor factory with a watchdog for automatic recovery.
 * The factory is invoked on each (re)start, so configuration is rebuilt every time.
 *
 * @param factory Async function that creates and returns an Editor instance.
 * @param watchdogConfig Configuration of the watchdog.
 * @returns The watchdog instance.
 */
export async function wrapWithWatchdog(factory: () => Promise<Editor>, watchdogConfig: WatchdogConfig | null) {
  const { EditorWatchdog } = await import('ckeditor5');

  const watchdog = new EditorWatchdog(null, watchdogConfig ?? {
    crashNumberLimit: 10,
    minimumNonErrorTimePeriod: 5000,
  });

  watchdog.setCreator(async () => {
    const editor = await factory();

    (editor as any)[EDITOR_WATCHDOG_SYMBOL] = watchdog;

    return editor;
  });

  return watchdog;
}

/**
 * Unwraps the EditorWatchdog from the editor instance.
 */
export function unwrapEditorWatchdog(editor: Editor): EditorWatchdog | null {
  if (EDITOR_WATCHDOG_SYMBOL in editor) {
    return (editor as any)[EDITOR_WATCHDOG_SYMBOL] as EditorWatchdog;
  }

  return null;
}
