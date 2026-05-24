import * as vscode from 'vscode';
import { registerOpenBriefComposer } from './commands/openBriefComposer';
import { registerOpenBriefFile } from './commands/openBriefFile';
import { registerOpenDecomposePrd } from './commands/openDecomposePrd';
import { registerOpenDiscover } from './commands/openDiscover';
import { registerOpenHello } from './commands/openHello';
import { registerOpenPrdEditor } from './commands/openPrdEditor';
import { registerOpenRequirements } from './commands/openRequirements';
import { registerOpenTestDesigner } from './commands/openTestDesigner';
import { registerOpenTestSpecFile } from './commands/openTestSpecFile';
import { registerProjectCreate } from './commands/projectCreate';
import { registerStagesRefresh } from './commands/stagesRefresh';
import { CONTEXT_KEYS } from './contextKeys';
import { MemoryStore } from './memory/MemoryStore';
import {
  IProjectRegistry,
  InMemoryProjectRegistry,
  PersistedProjectRegistry,
} from './projectRegistry';
import { briefComposerSerializer } from './serializers/briefComposerSerializer';
import { decomposePromptPanelSerializer } from './serializers/decomposePromptPanelSerializer';
import { discoverPanelSerializer } from './serializers/discoverPanelSerializer';
import { helloPanelSerializer } from './serializers/helloPanelSerializer';
import { prdEditorSerializer } from './serializers/prdEditorSerializer';
import { requirementsPanelSerializer } from './serializers/requirementsPanelSerializer';
import { testDesignerPanelSerializer } from './serializers/testDesignerPanelSerializer';
import { StageTreeProvider } from './tree/stageTreeProvider';
import { checkForUpdates } from './updater/checkForUpdates';
import {
  BRIEF_COMPOSER_VIEW_TYPE,
  openBriefComposerPanel,
} from './webview/briefComposerPanel';
import { DECOMPOSE_VIEW_TYPE, openDecomposePromptPanel } from './webview/decomposePromptPanel';
import { DISCOVER_VIEW_TYPE } from './webview/discoverPanel';
import { HELLO_VIEW_TYPE } from './webview/helloPanel';
import { HostMessenger } from './webview/messenger';
import { PRD_VIEW_TYPE } from './webview/prdPanel';
import { REQUIREMENTS_VIEW_TYPE } from './webview/requirementsPanel';
import { TEST_DESIGNER_VIEW_TYPE, openTestDesignerPanel } from './webview/testDesignerPanel';

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

  const stageTreeProvider = new StageTreeProvider(registry, memoryStore);
  const stageTreeView = vscode.window.createTreeView('deliveryos.stages', {
    treeDataProvider: stageTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(stageTreeView, stageTreeProvider);

  const host = new HostMessenger();
  host.registerHelloHandlers();
  if (memoryStore) {
    host.registerDiscoverHandlers({ registry, memoryStore });
    host.registerPrdHandlers({ registry, memoryStore });
    host.registerRequirementsHandlers({
      registry,
      memoryStore,
      openDecomposePanel: () => openDecomposePromptPanel(context, host),
      openTestDesignerPanel: (requirementEntryId) =>
        openTestDesignerPanel(context, host, { requirementEntryId }),
      openBriefComposerPanel: (args) => openBriefComposerPanel(context, host, args),
    });
    host.registerTestDesignerHandlers({ registry, memoryStore });
    host.registerBriefHandlers({ registry, memoryStore });
    if (workspaceFolder) {
      host.registerProfileHandlers({
        workspaceRoot: workspaceFolder.uri,
        workspaceState: context.workspaceState,
      });
    }
  }

  context.subscriptions.push(
    registerProjectCreate({
      registry,
      ...(memoryStore && { memoryStore }),
      ...(workspaceFolder && { workspaceUri: workspaceFolder.uri }),
    }),
    registerStagesRefresh(stageTreeProvider),
    registerOpenHello(context, host),
    registerOpenDiscover(context, host),
    registerOpenPrdEditor(context, host),
    registerOpenRequirements(context, host),
    registerOpenDecomposePrd(context, host),
    registerOpenTestDesigner(context, host),
    registerOpenTestSpecFile(memoryStore),
    registerOpenBriefComposer(context, host),
    registerOpenBriefFile(memoryStore),
    vscode.window.registerWebviewPanelSerializer(
      HELLO_VIEW_TYPE,
      helloPanelSerializer(context, host),
    ),
    vscode.window.registerWebviewPanelSerializer(
      DISCOVER_VIEW_TYPE,
      discoverPanelSerializer(context, host),
    ),
    vscode.window.registerWebviewPanelSerializer(
      PRD_VIEW_TYPE,
      prdEditorSerializer(context, host),
    ),
    vscode.window.registerWebviewPanelSerializer(
      REQUIREMENTS_VIEW_TYPE,
      requirementsPanelSerializer(context, host),
    ),
    vscode.window.registerWebviewPanelSerializer(
      DECOMPOSE_VIEW_TYPE,
      decomposePromptPanelSerializer(context, host),
    ),
    vscode.window.registerWebviewPanelSerializer(
      TEST_DESIGNER_VIEW_TYPE,
      testDesignerPanelSerializer(context, host),
    ),
    vscode.window.registerWebviewPanelSerializer(
      BRIEF_COMPOSER_VIEW_TYPE,
      briefComposerSerializer(context, host),
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

  void checkForUpdates(context);
}

export function deactivate(): void {}
