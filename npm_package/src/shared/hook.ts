import type { Hook, LiveSocketConstructor } from 'phoenix_live_view';

import type { RequiredBy } from '../types';

/**
 * An abstract class that provides a class-based API for creating Phoenix LiveView hooks.
 *
 * This class defines the structure and lifecycle methods of a hook, which can be extended
 * to implement custom client-side behavior that integrates with LiveView.
 */
export abstract class ClassHook {
  /**
   * The current state of the hook.
   */
  state: ClassHookState = 'mounting';

  /**
   * The DOM element the hook is attached to.
   * It includes an `instance` property to hold the hook instance.
   */
  el: HTMLElement & { instance: Hook; };

  /**
   * The LiveView socket instance, providing connection to the server.
   */
  liveSocket: LiveSocketConstructor;

  /**
   * Pushes an event from the client to the LiveView server process.
   * @param _event The name of the event.
   * @param _payload The data to send with the event.
   * @param _callback An optional function to be called with the server's reply.
   */
  pushEvent!: (
    _event: string,
    _payload: any,
    _callback?: (reply: any, ref: number) => void,
  ) => void;

  /**
   * Pushes an event to another hook on the page.
   * @param _selector The CSS selector of the target element with the hook.
   * @param _event The name of the event.
   * @param _payload The data to send with the event.
   * @param _callback An optional function to be called with the reply.
   */
  pushEventTo!: (
    _selector: string,
    _event: string,
    _payload: any,
    _callback?: (reply: any, ref: number) => void,
  ) => void;

  /**
   * Registers a handler for an event pushed from the server.
   * @param _event The name of the event to handle.
   * @param _callback The function to execute when the event is received.
   */
  handleEvent!: (
    _event: string,
    _callback: (payload: any) => void,
  ) => void;

  /**
   * Called when the hook has been mounted to the DOM.
   * This is the ideal place for initialization code.
   */
  abstract mounted(): any;

  /**
   * Called when the element has been removed from the DOM.
   * Perfect for cleanup tasks.
   */
  abstract destroyed(): any;

  /**
   * Called before the element is updated by a LiveView patch.
   */
  beforeUpdate?(): void;

  /**
   * Called when the client has disconnected from the server.
   */
  disconnected?(): void;

  /**
   * Called when the client has reconnected to the server.
   */
  reconnected?(): void;

  /**
   * Checks if the hook is in the process of being destroyed.
   */
  isBeingDestroyed(): boolean {
    return this.state === 'destroyed' || this.state === 'destroying';
  }
}

/**
 * A type that represents the state of a class-based hook.
 */
export type ClassHookState = 'mounting' | 'mounted' | 'destroying' | 'destroyed';

/**
 * A factory function that adapts a class-based hook to the object-based API expected by Phoenix LiveView.
 *
 * @param constructor The constructor of the class that extends the `Hook` abstract class.
 */
export function makeHook(constructor: new () => ClassHook): RequiredBy<Hook<any>, 'mounted' | 'destroyed'> {
  return {
    /**
     * The mounted lifecycle callback for the LiveView hook object.
     * It creates an instance of the user-defined hook class and sets up the necessary properties and methods.
     */
    async mounted(this: any) {
      const instance = new constructor();

      this.el.instance = instance;

      instance.el = this.el;
      instance.liveSocket = this.liveSocket;

      instance.pushEvent = (event, payload, callback) => this.pushEvent?.(event, payload, callback);
      instance.pushEventTo = (selector, event, payload, callback) => this.pushEventTo?.(selector, event, payload, callback);
      instance.handleEvent = (event, callback) => this.handleEvent?.(event, callback);

      instance.state = 'mounting';
      const result = await instance.mounted?.();
      instance.state = 'mounted';

      return result;
    },

    /**
     * The beforeUpdate lifecycle callback that delegates to the hook instance.
     */
    beforeUpdate(this: any) {
      this.el.instance.beforeUpdate?.();
    },

    /**
     * The destroyed lifecycle callback that delegates to the hook instance.
     */
    async destroyed(this: any) {
      const { instance } = this.el;

      instance.state = 'destroying';
      await instance.destroyed?.();
      instance.state = 'destroyed';
    },

    /**
     * The disconnected lifecycle callback that delegates to the hook instance.
     */
    disconnected(this: any) {
      this.el.instance.disconnected?.();
    },

    /**
     * The reconnected lifecycle callback that delegates to the hook instance.
     */
    reconnected(this: any) {
      this.el.instance.reconnected?.();
    },
  };
}
