import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });

await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: true,
  external: ['vscode'],
  logLevel: 'info',
});
