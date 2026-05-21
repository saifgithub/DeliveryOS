import * as vscode from 'vscode';
import { StageTreeProvider } from './stages/stageTreeProvider';

export function activate(context: vscode.ExtensionContext): void {
  console.log('DeliveryOS activated');

  const stageTreeProvider = new StageTreeProvider();
  const stageTreeView = vscode.window.createTreeView('deliveryos.stages', {
    treeDataProvider: stageTreeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(stageTreeView);
}

export function deactivate(): void {}
