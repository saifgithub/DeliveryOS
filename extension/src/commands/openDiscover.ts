import * as vscode from 'vscode';
import type { DiscoverMode } from '@deliveryos/contracts';
import { openDiscoverPanel } from '../webview/discoverPanel';
import type { HostMessenger } from '../webview/messenger';

export function registerOpenDiscover(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.openDiscover',
    (mode?: DiscoverMode) => openDiscoverPanel(context, host, mode),
  );
}
