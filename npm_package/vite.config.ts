/// <reference types="vitest" />
import { resolve } from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['**/*.test.ts'],
      include: ['src/**/*.ts'],
      compilerOptions: {
        rootDir: 'src/',
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CKEditor5Phoenix',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: isExternalModule,
      output: {
        globals: {
          'ckeditor5': 'CKEditor5',
          'ckeditor5-premium-features': 'CKEditor5PremiumFeatures',
          'phoenix_live_view': 'PhoenixLiveView',
        },
      },
    },
  },
  test: {
    globals: true,
    watch: false,
    environment: 'happy-dom',
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      exclude: [
        ...configDefaults.exclude,
        '**/node_modules/**',
        '**/dist/**',
        './src/**/index.ts',
        './scripts/**',
      ],
    },
  },
});

function isExternalModule(id: string): boolean {
  return [
    'ckeditor5',
    'ckeditor5-premium-features',
    'phoenix_live_view',
  ].includes(id)
  || /^ckeditor5\/translations\/.+\.js$/.test(id)
  || /^ckeditor5-premium-features\/translations\/.+\.js$/.test(id);
}
