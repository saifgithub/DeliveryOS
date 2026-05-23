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
