import * as vscode from 'vscode';
import { registerProjectCreate } from './commands/projectCreate';
import { registerStagesRefresh } from './commands/stagesRefresh';
import { CONTEXT_KEYS } from './contextKeys';
import { InMemoryProjectRegistry } from './projectRegistry';
import { StageTreeProvider } from './stages/stageTreeProvider';

export function activate(context: vscode.ExtensionContext): void {
  console.log('DeliveryOS activated');

  const registry = new InMemoryProjectRegistry();
  context.subscriptions.push(registry);

  const stageTreeProvider = new StageTreeProvider(registry);
  const stageTreeView = vscode.window.createTreeView('deliveryos.stages', {
    treeDataProvider: stageTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(stageTreeView);

  context.subscriptions.push(registerProjectCreate(registry));
  context.subscriptions.push(registerStagesRefresh(stageTreeProvider));

  vscode.commands.executeCommand(
    'setContext',
    CONTEXT_KEYS.hasProject,
    false,
  );
}

export function deactivate(): void {}
