import * as vscode from 'vscode';
import { openDecomposePromptPanel } from '../webview/decomposePromptPanel';
import type { HostMessenger } from '../webview/messenger';

export function registerOpenDecomposePrd(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.requirements.decompose',
    () => openDecomposePromptPanel(context, host),
  );
}
