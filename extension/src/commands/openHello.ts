import * as vscode from 'vscode';
import { openHelloPanel } from '../webview/helloPanel';
import type { HostMessenger } from '../webview/messenger';

export function registerOpenHello(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.Disposable {
  return vscode.commands.registerCommand('deliveryos.openHello', () =>
    openHelloPanel(context, host),
  );
}
