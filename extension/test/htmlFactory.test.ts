import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Uri, __makeStubWebview } from 'vscode';
import {
  renderPanelHtml,
  __resetManifestCache,
} from '../src/webview/htmlFactory';

const MANIFEST_FIXTURE = {
  'src/panels/hello/index.html': {
    file: 'assets/hello-abc.js',
    css: ['assets/hello-abc.css'],
    isEntry: true,
  },
  // Mirrors the real build: the panel entry carries NO css of its own; the
  // Tailwind stylesheet lives on a shared chunk reached via `imports`.
  'src/panels/discover/index.html': {
    file: 'assets/discover-xyz.js',
    imports: ['_tailwind-shared.js'],
    isEntry: true,
  },
  '_tailwind-shared.js': {
    file: 'assets/tailwind-shared.js',
    css: ['assets/tailwind-deadbeef.css'],
  },
};

describe('renderPanelHtml()', () => {
  let tmpDir: string;
  let extensionUri: Uri;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deliveryos-test-'));
    const viteDir = path.join(tmpDir, 'dist', 'webview', '.vite');
    await fs.mkdir(viteDir, { recursive: true });
    await fs.writeFile(
      path.join(viteDir, 'manifest.json'),
      JSON.stringify(MANIFEST_FIXTURE),
      'utf8',
    );
    extensionUri = Uri.file(tmpDir);
  });

  beforeEach(() => {
    __resetManifestCache();
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('renders the title, css link, script tag, and CSP meta', async () => {
    const webview = __makeStubWebview({
      cspSource: 'vscode-cdn.net',
      asWebviewUri: (u) => Uri.file(`webview:${u.fsPath}`),
    });

    const html = await renderPanelHtml({
      webview,
      extensionUri,
      entry: 'hello',
      title: 'DeliveryOS: Hello',
    });

    assert.match(html, /<title>DeliveryOS: Hello<\/title>/);
    assert.match(
      html,
      /<link rel="stylesheet" href="[^"]*hello-abc\.css[^"]*" \/>/,
    );
    assert.match(
      html,
      /<script type="module" nonce="[A-Za-z0-9_-]{32}" src="[^"]*hello-abc\.js[^"]*"><\/script>/,
    );
    assert.match(
      html,
      /<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'nonce-[A-Za-z0-9_-]{32}'[^"]*" \/>/,
    );
    assert.match(html, /default-src 'none'/);
    assert.match(html, /img-src vscode-cdn\.net https: data:/);
  });

  it('links CSS reached transitively through imports (Tailwind shared chunk)', async () => {
    const webview = __makeStubWebview({
      cspSource: 'vscode-cdn.net',
      asWebviewUri: (u) => Uri.file(`webview:${u.fsPath}`),
    });

    const html = await renderPanelHtml({
      webview,
      extensionUri,
      entry: 'discover',
      title: 'DeliveryOS: Discover',
    });

    // The entry has no own css, but the imported shared chunk's stylesheet
    // must still be linked — otherwise the panel renders unstyled.
    assert.match(
      html,
      /<link rel="stylesheet" href="[^"]*tailwind-deadbeef\.css[^"]*" \/>/,
    );
  });

  it('produces a different nonce on each invocation', async () => {
    const webview = __makeStubWebview();

    const extractNonce = (html: string): string => {
      const match = html.match(/nonce="([A-Za-z0-9_-]{32})"/);
      assert.ok(match, 'expected a nonce in the rendered HTML');
      return match[1];
    };

    const first = await renderPanelHtml({
      webview,
      extensionUri,
      entry: 'hello',
      title: 'DeliveryOS: Hello',
    });
    __resetManifestCache();
    const second = await renderPanelHtml({
      webview,
      extensionUri,
      entry: 'hello',
      title: 'DeliveryOS: Hello',
    });

    assert.notEqual(extractNonce(first), extractNonce(second));
  });

  it('throws a clear error when the manifest entry is missing', async () => {
    const webview = __makeStubWebview();
    await assert.rejects(
      () =>
        renderPanelHtml({
          webview,
          extensionUri,
          entry: 'nope',
          title: 'DeliveryOS: Hello',
        }),
      /vite manifest missing entry "src\/panels\/nope\/index\.html"/,
    );
  });
});
