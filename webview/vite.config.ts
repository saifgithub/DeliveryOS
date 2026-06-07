import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: '.vite/manifest.json',
    rollupOptions: {
      input: {
        hello: resolve(__dirname, 'src/panels/hello/index.html'),
        discover: resolve(__dirname, 'src/panels/discover/index.html'),
        'prd-editor': resolve(__dirname, 'src/panels/prd-editor/index.html'),
        'requirements-decompose': resolve(
          __dirname,
          'src/panels/requirements-decompose/index.html',
        ),
        requirements: resolve(__dirname, 'src/panels/requirements/index.html'),
        'test-designer': resolve(__dirname, 'src/panels/test-designer/index.html'),
        'brief-composer': resolve(__dirname, 'src/panels/brief-composer/index.html'),
        'result-detail': resolve(__dirname, 'src/panels/result/index-detail.html'),
        'result-paste': resolve(__dirname, 'src/panels/result/index-paste.html'),
        'diff-results': resolve(__dirname, 'src/panels/diff-results/index.html'),
        'verification': resolve(__dirname, 'src/panels/verification/index.html'),
        'change-request': resolve(__dirname, 'src/panels/change-request/index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    sourcemap: false,
    target: 'es2022',
    minify: 'esbuild',
  },
});
