import * as vscode from 'vscode';
import { openPrdPanel } from '../webview/prdPanel';
import type { HostMessenger } from '../webview/messenger';

export function registerOpenPrdEditor(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.prd.open',
    () => openPrdPanel(context, host),
  );
}
