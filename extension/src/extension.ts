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
import { registerOpenReverse } from './commands/openReverse';
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
import { changeRequestPanelSerializer } from './serializers/changeRequestPanelSerializer';
import { bugPanelSerializer } from './serializers/bugPanelSerializer';
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
import {
  CHANGE_REQUEST_VIEW_TYPE,
  openChangeRequestPanel,
} from './webview/changeRequestPanel';
import { BUG_VIEW_TYPE, openBugPanel } from './webview/bugPanel';
import { DECOMPOSE_VIEW_TYPE, openDecomposePromptPanel } from './webview/decomposePromptPanel';
import { DISCOVER_VIEW_TYPE } from './webview/discoverPanel';
import { HELLO_VIEW_TYPE } from './webview/helloPanel';
import { HostMessenger } from './webview/messenger';
import { PRD_VIEW_TYPE } from './webview/prdPanel';
import { REQUIREMENTS_VIEW_TYPE } from './webview/requirementsPanel';
import { TEST_DESIGNER_VIEW_TYPE, openTestDesignerPanel } from './webview/testDesignerPanel';
import { captureFromHandoff, onResultCaptured } from './result/captureFlow';
import { openPasteFallbackPanel } from './panels/result/resultHost';
import { registerDiffOpenForResultCommand } from './panels/diff-results/diffResultsCommand';
import { registerRecomputeDiffCommand } from './diff/recompute';
import { openVerificationPanel } from './panels/verification/verificationHost';
import { ReverseWatcher } from './reverse/reverseWatcher';
import { captureReversePrd } from './reverse/reverseCapture';

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
    host.registerChangeRequestHandlers({
      registry,
      memoryStore,
      openChangeRequestPanel: (args) => openChangeRequestPanel(context, host, args),
    });
    host.registerBugHandlers({
      registry,
      memoryStore,
      ...(workspaceFolder ? { workspace: workspaceFolder.uri } : {}),
    });
    if (workspaceFolder) {
      host.registerProfileHandlers({
        workspaceRoot: workspaceFolder.uri,
        workspaceState: context.workspaceState,
      });
      const capturedWorkspaceFolder = workspaceFolder;
      const capturedMemoryStore = memoryStore;
      const handoffDisposable = host.registerHandoffHandlers({
        registry,
        memoryStore,
        workspace: workspaceFolder,
        globalState: context.globalState,
        onResultMdReady: (event) =>
          void captureFromHandoff(event, capturedMemoryStore, capturedWorkspaceFolder),
      });
      context.subscriptions.push(handoffDisposable);

      // DOS:P10: reverse path (code → docs). The watcher detects the PRD the
      // agent writes to `.deliveryos-reverse/prd.md`, parses + stores it, then
      // converges onto the existing forward pipeline (decompose → requirements).
      const reverseWatcher = new ReverseWatcher(capturedWorkspaceFolder);
      const reverseWatcherSub = reverseWatcher.onPrd(async (event) => {
        try {
          const result = await captureReversePrd({
            contentBytes: event.contentBytes,
            memoryStore: capturedMemoryStore,
            registry,
          });
          stageTreeProvider.refresh();
          const pick = await vscode.window.showInformationMessage(
            `DeliveryOS Reverse: PRD captured (${result.sectionsFound}/8 sections). ` +
              'Open the PRD editor to review, then Decompose into requirements.',
            'Open PRD editor',
          );
          if (pick === 'Open PRD editor') {
            await vscode.commands.executeCommand('deliveryos.prd.open');
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          void vscode.window.showErrorMessage(
            `DeliveryOS reverse capture failed: ${message}`,
          );
        }
      });
      context.subscriptions.push(
        reverseWatcher,
        reverseWatcherSub,
        registerOpenReverse({
          registry,
          memoryStore: capturedMemoryStore,
          workspace: capturedWorkspaceFolder,
        }),
      );
    }
  }

  // CHUNK-12: result capture — subscribe tree provider to result events.
  context.subscriptions.push(
    onResultCaptured(() => stageTreeProvider.refresh()),
  );

  // CHUNK-12: register paste fallback command.
  context.subscriptions.push(
    vscode.commands.registerCommand('deliveryos.result.openPasteFallback', () =>
      openPasteFallbackPanel(context, host),
    ),
  );

  // CHUNK-13: diff commands.
  if (memoryStore) {
    context.subscriptions.push(
      registerDiffOpenForResultCommand(context, memoryStore),
      registerRecomputeDiffCommand(memoryStore),
    );
    // deliveryos.diff.installClaudeHook is handled by the diff-results panel itself.
  }

  // CHUNK-14: verification command.
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'deliveryos.verify.open',
      (args: { verificationEntryId?: string; requirementEntryId?: string; resultEntryId?: string; testSpecEntryId?: string }) => {
        if (!memoryStore) {
          vscode.window.showErrorMessage('DeliveryOS: no memory store available.');
          return;
        }
        const requirementEntryId = args?.requirementEntryId ?? '';
        const resultEntryId = args?.resultEntryId ?? '';
        const testSpecEntryId = args?.testSpecEntryId ?? '';
        return openVerificationPanel(context, memoryStore, {
          requirementEntryId,
          resultEntryId,
          testSpecEntryId,
        });
      },
    ),
    vscode.commands.registerCommand(
      'deliveryos.release.openDocument',
      async (args: { releaseEntryId?: string }) => {
        if (!memoryStore || !workspaceFolder) return;
        if (!args?.releaseEntryId) return;
        const entry = await memoryStore.read(args.releaseEntryId);
        if (!entry || entry.type !== 'release') return;
        const payload = entry.payload as { documentPath?: string };
        if (!payload.documentPath) return;
        const docUri = vscode.Uri.joinPath(workspaceFolder.uri, payload.documentPath);
        await vscode.window.showTextDocument(docUri);
      },
    ),
  );

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
    vscode.commands.registerCommand(
      'deliveryos.changeRequest.open',
      (args?: { crEntryId?: string }) => openChangeRequestPanel(context, host, args),
    ),
    vscode.commands.registerCommand(
      'deliveryos.bug.open',
      (args?: { bugEntryId?: string }) => openBugPanel(context, host, args),
    ),
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
    vscode.window.registerWebviewPanelSerializer(
      CHANGE_REQUEST_VIEW_TYPE,
      changeRequestPanelSerializer(context, host),
    ),
    vscode.window.registerWebviewPanelSerializer(
      BUG_VIEW_TYPE,
      bugPanelSerializer(context, host),
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
