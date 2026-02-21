import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassHook, makeHook } from './hook';

class TestHook extends ClassHook {
  override mounted = vi.fn();
  override beforeUpdate = vi.fn();
  override destroyed = vi.fn();
  override disconnected = vi.fn();
  override reconnected = vi.fn();
}

describe('makeHook', () => {
  let hookObject: any;
  let mockContext: any;
  let mockElement: HTMLElement & { instance: any; };

  beforeEach(() => {
    hookObject = makeHook(TestHook);
    mockElement = document.createElement('div') as any;

    mockContext = {
      el: mockElement,
      pushEvent: vi.fn(),
      pushEventTo: vi.fn(),
      handleEvent: vi.fn(),
    };
  });

  it('should return an object with all lifecycle methods', () => {
    expect(hookObject).toHaveProperty('mounted');
    expect(hookObject).toHaveProperty('beforeUpdate');
    expect(hookObject).toHaveProperty('destroyed');
    expect(hookObject).toHaveProperty('disconnected');
    expect(hookObject).toHaveProperty('reconnected');
  });

  it('should create and initialize hook instance on mounted', () => {
    hookObject.mounted.call(mockContext);

    expect(mockContext.el.instance).toBeInstanceOf(TestHook);
    expect(mockContext.el.instance.el).toBe(mockContext.el);
    expect(mockContext.el.instance.mounted).toHaveBeenCalledOnce();
  });

  it('should bind pushEvent method correctly', () => {
    hookObject.mounted.call(mockContext);

    const testEvent = 'test-event';
    const testPayload = { data: 'test' };
    const testCallback = vi.fn();

    mockContext.el.instance.pushEvent(testEvent, testPayload, testCallback);

    expect(mockContext.pushEvent).toHaveBeenCalledWith(testEvent, testPayload, testCallback);
  });

  it('should bind pushEventTo method correctly', () => {
    hookObject.mounted.call(mockContext);

    const testSelector = '.test-selector';
    const testEvent = 'test-event';
    const testPayload = { data: 'test' };
    const testCallback = vi.fn();

    mockContext.el.instance.pushEventTo(testSelector, testEvent, testPayload, testCallback);

    expect(mockContext.pushEventTo).toHaveBeenCalledWith(testSelector, testEvent, testPayload, testCallback);
  });

  it('should bind handleEvent method correctly', () => {
    hookObject.mounted.call(mockContext);

    const testEvent = 'test-event';
    const testCallback = vi.fn();

    mockContext.el.instance.handleEvent(testEvent, testCallback);

    expect(mockContext.handleEvent).toHaveBeenCalledWith(testEvent, testCallback);
  });

  it('should delegate beforeUpdate to hook instance', () => {
    hookObject.mounted.call(mockContext);
    hookObject.beforeUpdate.call(mockContext);

    expect(mockContext.el.instance.beforeUpdate).toHaveBeenCalledOnce();
  });

  it('should delegate destroyed to hook instance', () => {
    hookObject.mounted.call(mockContext);
    hookObject.destroyed.call(mockContext);

    expect(mockContext.el.instance.destroyed).toHaveBeenCalledOnce();
  });

  it('should delegate disconnected to hook instance', () => {
    hookObject.mounted.call(mockContext);
    hookObject.disconnected.call(mockContext);

    expect(mockContext.el.instance.disconnected).toHaveBeenCalledOnce();
  });

  it('should delegate reconnected to hook instance', () => {
    hookObject.mounted.call(mockContext);
    hookObject.reconnected.call(mockContext);

    expect(mockContext.el.instance.reconnected).toHaveBeenCalledOnce();
  });

  it('should handle hooks without optional lifecycle methods', () => {
    class MinimalHook extends ClassHook {
      override mounted = vi.fn();
      override destroyed = vi.fn();
    }

    const minimalHookObject = makeHook(MinimalHook);

    minimalHookObject.mounted.call(mockContext);

    expect(() => {
      minimalHookObject.destroyed.call(mockContext);
    }).not.toThrow();
  });

  it('should register and execute onBeforeDestroy callbacks in LIFO order', async () => {
    const calls: string[] = [];

    class BeforeDestroyHook extends ClassHook {
      override mounted() {
        this.onBeforeDestroy(() => calls.push('first'));
        this.onBeforeDestroy(() => calls.push('second'));
      }
    }

    const hookObj = makeHook(BeforeDestroyHook);

    hookObj.mounted.call(mockContext);
    hookObj.destroyed.call(mockContext);

    expect(calls).toEqual(['second', 'first']);
  });

  it('should allow lifecycle methods to be empty without errors', async () => {
    class EmptyHook extends ClassHook {}
    const hookObj = makeHook(EmptyHook);

    await expect(hookObj.mounted.call(mockContext)).resolves.not.toThrow();

    expect(() => hookObj.beforeUpdate?.call(mockContext)).not.toThrow();
    expect(() => hookObj.updated?.call(mockContext)).not.toThrow();
    expect(() => hookObj.disconnected?.call(mockContext)).not.toThrow();
    expect(() => hookObj.reconnected?.call(mockContext)).not.toThrow();

    await expect(hookObj.destroyed.call(mockContext)).resolves.not.toThrow();
  });
});
