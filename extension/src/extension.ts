import * as vscode from 'vscode';
import { registerOpenHello } from './commands/openHello';
import { registerProjectCreate } from './commands/projectCreate';
import { registerStagesRefresh } from './commands/stagesRefresh';
import { CONTEXT_KEYS } from './contextKeys';
import { InMemoryProjectRegistry } from './projectRegistry';
import { helloPanelSerializer } from './serializers/helloPanelSerializer';
import { StageTreeProvider } from './tree/stageTreeProvider';
import { HELLO_VIEW_TYPE } from './webview/helloPanel';
import { HostMessenger } from './webview/messenger';

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

  const host = new HostMessenger();
  host.registerHelloHandlers();

  context.subscriptions.push(
    registerProjectCreate(registry),
    registerStagesRefresh(stageTreeProvider),
    registerOpenHello(context, host),
    vscode.window.registerWebviewPanelSerializer(
      HELLO_VIEW_TYPE,
      helloPanelSerializer(context, host),
    ),
  );

  vscode.commands.executeCommand(
    'setContext',
    CONTEXT_KEYS.hasProject,
    false,
  );
}

export function deactivate(): void {}
