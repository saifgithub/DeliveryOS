import { execSync } from 'node:child_process';
import { rmSync, cpSync, copyFileSync, existsSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npm -w @deliveryos/contracts run build');
run('npm -w @deliveryos/webview run build');
run('npm -w deliveryos run build');

const webviewDist = 'webview/dist';
const targetDir = 'extension/dist/webview';

if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true });
}
cpSync(webviewDist, targetDir, { recursive: true });
console.log(`copied ${webviewDist} → ${targetDir}`);

const sqlWasmSrc = 'node_modules/sql.js/dist/sql-wasm.wasm';
const sqlWasmDst = 'extension/dist/sql-wasm.wasm';
copyFileSync(sqlWasmSrc, sqlWasmDst);
console.log(`copied ${sqlWasmSrc} → ${sqlWasmDst}`);
