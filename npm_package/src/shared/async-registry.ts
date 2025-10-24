/**
 * Generic async registry for objects with an async destroy method.
 * Provides a way to register, unregister, and execute callbacks on objects by ID.
 */
export class AsyncRegistry<T extends Destructible> {
  /**
   * Map of registered items.
   */
  private readonly items = new Map<RegistryId | null, T>();

  /**
   * Map of initialization errors for items that failed to register.
   */
  private readonly initializationErrors = new Map<RegistryId | null, any>();

  /**
   * Map of pending callbacks waiting for items to be registered or fail.
   */
  private readonly pendingCallbacks = new Map<RegistryId | null, PendingCallbacks<T>>();

  /**
   * Set of watchers that observe changes to the registry.
   */
  private readonly watchers = new Set<RegistryWatcher<T>>();

  /**
   * Executes a function on an item.
   * If the item is not yet registered, it will wait for it to be registered.
   *
   * @param id The ID of the item.
   * @param onSuccess The function to execute.
   * @param onError Optional error callback.
   * @returns A promise that resolves with the result of the function.
   */
  execute<R, E extends T = T>(
    id: RegistryId | null,
    onSuccess: (item: E) => R,
    onError?: (error: any) => void,
  ): Promise<Awaited<R>> {
    const item = this.items.get(id);
    const error = this.initializationErrors.get(id);

    // If error exists and callback provided, invoke it immediately.
    if (error) {
      onError?.(error);
      return Promise.reject(error);
    }

    // If item exists, invoke callback immediately (synchronously via Promise.resolve).
    if (item) {
      return Promise.resolve(onSuccess(item as E));
    }

    // Item not ready yet - queue the callbacks.
    return new Promise((resolve, reject) => {
      const pending = this.getPendingCallbacks(id);

      pending.success.push(async (item: T) => {
        resolve(await onSuccess(item as E));
      });

      if (onError) {
        pending.error.push(onError);
      }
      else {
        pending.error.push(reject);
      }
    });
  }

  /**
   * Registers an item.
   *
   * @param id The ID of the item.
   * @param item The item instance.
   */
  register(id: RegistryId | null, item: T): void {
    if (this.items.has(id)) {
      throw new Error(`Item with ID "${id}" is already registered.`);
    }

    this.resetErrors(id);
    this.items.set(id, item);

    // Execute all pending callbacks for this item (synchronously).
    const pending = this.pendingCallbacks.get(id);

    if (pending) {
      pending.success.forEach(callback => callback(item));
      this.pendingCallbacks.delete(id);
    }

    // Register the first item as the default item (null ID).
    this.registerAsDefault(id, item);
    this.notifyWatchers();
  }

  /**
   * Registers an error for an item.
   *
   * @param id The ID of the item.
   * @param error The error to register.
   */
  error(id: RegistryId | null, error: any): void {
    this.items.delete(id);
    this.initializationErrors.set(id, error);

    // Execute all pending error callbacks for this item.
    const pending = this.pendingCallbacks.get(id);

    if (pending) {
      pending.error.forEach(callback => callback(error));
      this.pendingCallbacks.delete(id);
    }

    // Set as default error if this is the first error and no items exist.
    if (this.initializationErrors.size === 1 && !this.items.size) {
      this.error(null, error);
    }

    // Notify watchers about the error state.
    this.notifyWatchers();
  }

  /**
   * Resets errors for an item.
   *
   * @param id The ID of the item.
   */
  resetErrors(id: RegistryId | null): void {
    const { initializationErrors } = this;

    // Clear default error if it's the same as the specific error.
    if (initializationErrors.has(null) && initializationErrors.get(null) === initializationErrors.get(id)) {
      initializationErrors.delete(null);
    }

    initializationErrors.delete(id);
  }

  /**
   * Un-registers an item.
   *
   * @param id The ID of the item.
   */
  unregister(id: RegistryId | null): void {
    if (!this.items.has(id)) {
      throw new Error(`Item with ID "${id}" is not registered.`);
    }

    // If unregistering the default item, clear it.
    if (id && this.items.get(null) === this.items.get(id)) {
      this.unregister(null);
    }

    this.items.delete(id);
    this.pendingCallbacks.delete(id);

    this.notifyWatchers();
  }

  /**
   * Gets all registered items.
   *
   * @returns An array of all registered items.
   */
  getItems(): T[] {
    return Array.from(this.items.values());
  }

  /**
   * Checks if an item with the given ID is registered.
   *
   * @param id The ID of the item.
   * @returns `true` if the item is registered, `false` otherwise.
   */
  hasItem(id: RegistryId | null): boolean {
    return this.items.has(id);
  }

  /**
   * Gets a promise that resolves with the item instance for the given ID.
   * If the item is not registered yet, it will wait for it to be registered.
   *
   * @param id The ID of the item.
   * @returns A promise that resolves with the item instance.
   */
  waitFor<E extends T = T>(id: RegistryId | null): Promise<E> {
    return new Promise<E>((resolve, reject) => {
      void this.execute(id, resolve as (value: E) => void, reject);
    });
  }

  /**
   * Destroys all registered items and clears the registry.
   * This will call the `destroy` method on each item.
   */
  async destroyAll() {
    const promises = (
      Array
        .from(new Set(this.items.values()))
        .map(item => item.destroy())
    );

    this.items.clear();
    this.pendingCallbacks.clear();

    await Promise.all(promises);

    this.notifyWatchers();
  }

  /**
   * Registers a watcher that will be called whenever the registry changes.
   *
   * @param watcher The watcher function to register.
   * @returns A function to unregister the watcher.
   */
  watch(watcher: RegistryWatcher<T>): () => void {
    this.watchers.add(watcher);

    // Call the watcher immediately with the current state.
    watcher(
      new Map(this.items),
      new Map(this.initializationErrors),
    );

    return this.unwatch.bind(this, watcher);
  }

  /**
   * Un-registers a watcher.
   *
   * @param watcher The watcher function to unregister.
   */
  unwatch(watcher: RegistryWatcher<T>): void {
    this.watchers.delete(watcher);
  }

  /**
   * Notifies all watchers about changes to the registry.
   */
  private notifyWatchers(): void {
    this.watchers.forEach(
      watcher => watcher(
        new Map(this.items),
        new Map(this.initializationErrors),
      ),
    );
  }

  /**
   * Gets or creates pending callbacks for a specific ID.
   *
   * @param id The ID of the item.
   * @returns The pending callbacks structure.
   */
  private getPendingCallbacks(id: RegistryId | null): PendingCallbacks<T> {
    let pending = this.pendingCallbacks.get(id);

    if (!pending) {
      pending = { success: [], error: [] };
      this.pendingCallbacks.set(id, pending);
    }

    return pending;
  }

  /**
   * Registers an item as the default (null ID) item if it's the first one.
   *
   * @param id The ID of the item being registered.
   * @param item The item instance.
   */
  private registerAsDefault(id: RegistryId | null, item: T): void {
    if (this.items.size === 1 && id !== null) {
      this.register(null, item);
    }
  }
}

/**
 * Interface for objects that can be destroyed.
 */
export type Destructible = {
  destroy: () => Promise<any>;
};

/**
 * Identifier of the registry item.
 */
type RegistryId = string;

/**
 * Structure holding pending success and error callbacks for an item.
 */
type PendingCallbacks<T> = {
  success: Array<(item: T) => void>;
  error: Array<(error: Error) => void>;
};

/**
 * Callback type for watching registry changes.
 */
type RegistryWatcher<T> = (
  items: Map<RegistryId | null, T>,
  errors: Map<RegistryId | null, Error>,
) => void;
