/* eslint-disable no-console */
import { CustomEditorPluginsRegistry, Hooks } from 'ckeditor5-phoenix';
import { Socket } from 'phoenix';
import { LiveSocket } from 'phoenix_live_view';

CustomEditorPluginsRegistry.the.register('HelloWorldPlugin', async () => {
  const { Plugin } = await import('ckeditor5');

  return class HelloWorldPlugin extends Plugin {
    static get pluginName() {
      return 'HelloWorldPlugin';
    }

    init() {
      console.info('Hello, World! Plugin initialized.');
    }
  };
});

CustomEditorPluginsRegistry.the.register('CustomContextPlugin', async () => {
  const { ContextPlugin } = await import('ckeditor5');

  return class CustomContextPlugin extends ContextPlugin {
    static get pluginName() {
      return 'CustomContextPlugin';
    }

    init() {
      const { editors } = this.context;

      console.info('Custom Context Plugin initialized.');

      editors!.on('add', (_, editor) => {
        console.info('[MyCustomContextPlugin] Editor added:', editor);
      });

      editors!.on('remove', (_, editor) => {
        console.info('[MyCustomContextPlugin] Editor removed:', editor);
      });
    }
  };
});

const csrfToken = document.querySelector('meta[name=\'csrf-token\']')!.getAttribute('content');
const liveSocket = new LiveSocket('/live', Socket, {
  params: { _csrf_token: csrfToken },
  hooks: {
    ...Hooks,
  },
});

liveSocket.connect();
