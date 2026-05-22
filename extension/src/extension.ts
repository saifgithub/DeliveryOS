import * as vscode from 'vscode';
import { registerOpenHello } from './commands/openHello';
import { registerProjectCreate } from './commands/projectCreate';
import { registerStagesRefresh } from './commands/stagesRefresh';
import { CONTEXT_KEYS } from './contextKeys';
import { MemoryStore } from './memory/MemoryStore';
import {
  IProjectRegistry,
  InMemoryProjectRegistry,
  PersistedProjectRegistry,
} from './projectRegistry';
import { helloPanelSerializer } from './serializers/helloPanelSerializer';
import { StageTreeProvider } from './tree/stageTreeProvider';
import { HELLO_VIEW_TYPE } from './webview/helloPanel';
import { HostMessenger } from './webview/messenger';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('DeliveryOS activated');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  let registry: IProjectRegistry;
  let memoryStore: MemoryStore | undefined;

  if (workspaceFolder) {
    try {
      memoryStore = await MemoryStore.open(context, workspaceFolder);
      const persisted = new PersistedProjectRegistry(memoryStore);
      await persisted.loadActive();
      registry = persisted;
      context.subscriptions.push({ dispose: () => void memoryStore?.close() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(
        `DeliveryOS: failed to open memory store — ${message}. Falling back to in-memory.`,
      );
      registry = new InMemoryProjectRegistry();
    }
  } else {
    registry = new InMemoryProjectRegistry();
  }
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
    registerProjectCreate({
      registry,
      ...(memoryStore && { memoryStore }),
      ...(workspaceFolder && { workspaceUri: workspaceFolder.uri }),
    }),
    registerStagesRefresh(stageTreeProvider),
    registerOpenHello(context, host),
    vscode.window.registerWebviewPanelSerializer(
      HELLO_VIEW_TYPE,
      helloPanelSerializer(context, host),
    ),
  );

  await vscode.commands.executeCommand(
    'setContext',
    CONTEXT_KEYS.hasProject,
    registry.getActive() !== undefined,
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      vscode.window
        .showInformationMessage(
          'DeliveryOS: workspace folders changed. Reload the window to reinitialise the memory store.',
          'Reload',
        )
        .then((sel) => {
          if (sel === 'Reload') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        });
    }),
  );
}

export function deactivate(): void {}
