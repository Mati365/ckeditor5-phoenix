import type { FileLoader, PluginConstructor, UploadAdapter } from 'ckeditor5';

import { getCsrfToken } from '../../../shared';

/**
 * Creates a PhoenixUploadAdapter plugin class for CKEditor 5.
 * This adapter handles image uploads to a Phoenix backend endpoint.
 */
export async function createPhoenixUploadAdapterPlugin(): Promise<PluginConstructor> {
  const { Plugin, FileRepository } = await import('ckeditor5');

  return class PhoenixUploadAdapter extends Plugin {
    /**
     * The name of the plugin.
     */
    static get pluginName() {
      return 'PhoenixUploadAdapter' as const;
    }

    static get requires() {
      return [FileRepository];
    }

    /**
     * Initializes the plugin.
     */
    public init(): void {
      const { editor } = this;
      const { plugins, config } = editor;
      const uploadUrl = config.get('phoenixUpload.url');

      if (!uploadUrl) {
        return;
      }

      // Check if we should enable this adapter
      if (
        plugins.has('SimpleUploadAdapter')
        || plugins.has('Base64UploadAdapter')
        || plugins.has('CKFinderUploadAdapter')
      ) {
        return;
      }

      // Register the upload adapter
      const fileRepository = plugins.get(FileRepository);

      fileRepository.createUploadAdapter = (loader: FileLoader) => new Adapter(loader, uploadUrl);
    }
  };
}

declare module 'ckeditor5' {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface EditorConfig {
    /**
     * Configuration for Phoenix upload adapter.
     */
    phoenixUpload?: {
      /**
       * The URL to which files will be uploaded.
       */
      url: string;
    };
  }
}

/**
 * Upload adapter that handles communication with Phoenix backend.
 */
class Adapter implements UploadAdapter {
  private readonly loader: FileLoader;
  private readonly uploadUrl: string;
  private abortController: AbortController | null = null;

  constructor(loader: FileLoader, uploadUrl: string) {
    this.loader = loader;
    this.uploadUrl = uploadUrl;
  }

  /**
   * Starts the upload process.
   */
  public async upload(): Promise<{ default: string; }> {
    const file = (await this.loader.file)!;

    this.abortController = new AbortController();

    const data = new FormData();

    data.append('file', file);

    // Attempt to track progress if the file size is known, though fetch doesn't support
    // upload progress events natively.
    if (file.size) {
      this.loader.uploadTotal = file.size;
      this.loader.uploaded = 0;
    }

    const headers: HeadersInit = {};
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    try {
      const response = await fetch(this.uploadUrl, {
        method: 'POST',
        headers,
        body: data,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        let errorMessage = 'Couldn\'t upload file!';

        try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          }
        }
        catch { /* ignore */ }

        throw new Error(errorMessage);
      }

      this.loader.uploaded = this.loader.uploadTotal!;

      const result = await response.json();

      return {
        default: result.url,
      };
    }
    /* v8 ignore next 7 */
    catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }

      throw error.message || 'Couldn\'t upload file!';
    }
  }

  /**
   * Aborts the upload process.
   */
  /* v8 ignore next 4 */
  public abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}
