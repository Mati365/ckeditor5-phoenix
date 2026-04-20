import { ClassicEditor, EditorWatchdog } from 'ckeditor5';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { unwrapEditorWatchdog, wrapWithWatchdog } from './wrap-with-watchdog';

describe('wrap with watchdog', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('returns editor instance after starting the watchdog', async () => {
    const factory = () => ClassicEditor.create(element, { licenseKey: 'GPL' });
    const watchdog = await wrapWithWatchdog(factory, null);

    await watchdog.create({});

    expect(watchdog.editor).toBeInstanceOf(ClassicEditor);

    await watchdog.destroy();
  });

  it('returns instance of watchdog', async () => {
    const factory = () => ClassicEditor.create(element, { licenseKey: 'GPL' });
    const watchdog = await wrapWithWatchdog(factory, null);

    expect(watchdog).toBeInstanceOf(EditorWatchdog);
  });

  it('should be possible to unwrap watchdog from editor instance', async () => {
    const factory = () => ClassicEditor.create(element, { licenseKey: 'GPL' });
    const watchdog = await wrapWithWatchdog(factory, null);

    await watchdog.create({});

    expect(unwrapEditorWatchdog(watchdog.editor!)).toBeInstanceOf(EditorWatchdog);

    await watchdog.destroy();
  });

  it('rebuilds config by calling factory again on restart', async () => {
    let callCount = 0;
    const factory = async () => {
      callCount++;
      return ClassicEditor.create(element, { licenseKey: 'GPL' });
    };

    const watchdog = await wrapWithWatchdog(factory, null);
    await watchdog.create({});

    expect(callCount).toBe(1);

    await (watchdog as any)._restart();

    expect(callCount).toBe(2);

    await watchdog.destroy();
  });
});
