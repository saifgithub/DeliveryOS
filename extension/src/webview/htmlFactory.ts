import * as vscode from 'vscode';
import { promises as fs } from 'node:fs';
import { nonce as makeNonce } from './nonce';

interface ViteManifestEntry {
  file: string;
  css?: string[];
  isEntry?: boolean;
}

type ViteManifest = Record<string, ViteManifestEntry>;

let cachedManifest: ViteManifest | undefined;

async function loadManifest(extensionUri: vscode.Uri): Promise<ViteManifest> {
  if (cachedManifest) return cachedManifest;
  const manifestUri = vscode.Uri.joinPath(
    extensionUri,
    'dist',
    'webview',
    '.vite',
    'manifest.json',
  );
  const raw = await fs.readFile(manifestUri.fsPath, 'utf8');
  cachedManifest = JSON.parse(raw) as ViteManifest;
  return cachedManifest;
}

export interface RenderPanelHtmlOptions {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  entry: string;
  title: string;
}

export async function renderPanelHtml(
  opts: RenderPanelHtmlOptions,
): Promise<string> {
  const { webview, extensionUri, entry, title } = opts;
  const manifest = await loadManifest(extensionUri);

  const entryKey = `src/panels/${entry}/index.html`;
  const entryRecord = manifest[entryKey];
  if (!entryRecord) {
    throw new Error(
      `DeliveryOS: vite manifest missing entry "${entryKey}". Did the webview build run?`,
    );
  }

  const distRoot = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(distRoot, entryRecord.file),
  );
  const cssUris = (entryRecord.css ?? []).map((href) =>
    webview.asWebviewUri(vscode.Uri.joinPath(distRoot, href)),
  );

  const nonce = makeNonce();
  const cspSource = webview.cspSource;

  const csp = [
    `default-src 'none'`,
    `img-src ${cspSource} https: data:`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `font-src ${cspSource}`,
    `script-src 'nonce-${nonce}'`,
    `connect-src ${cspSource}`,
  ].join('; ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${cssUris.map((u) => `<link rel="stylesheet" href="${u.toString()}" />`).join('\n    ')}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri.toString()}"></script>
  </body>
</html>`;
}
