import * as vscode from 'vscode';
import { promises as fs } from 'node:fs';
import { nonce as makeNonce } from './nonce';

interface ViteManifestEntry {
  file: string;
  css?: string[];
  imports?: string[];
  isEntry?: boolean;
}

type ViteManifest = Record<string, ViteManifestEntry>;

/**
 * Collect every CSS file an entry depends on, walking the import graph.
 *
 * Vite attaches a chunk's CSS to the manifest record of whichever chunk
 * `import`s the stylesheet. Tailwind is imported once from a shared module, so
 * its CSS lands on that shared chunk (`_tailwind-*.js`) — NOT on the per-panel
 * entry. Linking only `entryRecord.css` therefore ships every panel unstyled.
 * Resolve CSS transitively through `imports` instead.
 */
function collectCss(
  manifest: ViteManifest,
  key: string,
  seen: Set<string> = new Set(),
): string[] {
  if (seen.has(key)) return [];
  seen.add(key);
  const record = manifest[key];
  if (!record) return [];
  const css = [...(record.css ?? [])];
  for (const imported of record.imports ?? []) {
    css.push(...collectCss(manifest, imported, seen));
  }
  return css;
}

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

export function __resetManifestCache(): void {
  cachedManifest = undefined;
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
  const cssHrefs = [...new Set(collectCss(manifest, entryKey))];
  const cssUris = cssHrefs.map((href) =>
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
