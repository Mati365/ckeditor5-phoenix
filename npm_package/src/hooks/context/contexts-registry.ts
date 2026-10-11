import type { Context } from 'ckeditor5';

import { AsyncRegistry } from '../../shared';

/**
 * It provides a way to register contexts and execute callbacks on them when they are available.
 */
export class ContextsRegistry extends AsyncRegistry<Context> {
  static readonly the = new ContextsRegistry();
}
