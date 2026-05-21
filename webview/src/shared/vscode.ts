import type { WebviewApi } from 'vscode-webview';

let cached: WebviewApi<unknown> | undefined;

export function vscode(): WebviewApi<unknown> {
  if (!cached) {
    cached = acquireVsCodeApi();
  }
  return cached;
}
