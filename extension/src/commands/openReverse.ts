// DOS:P10 § commands/openReverse.ts — the REVERSE path entry point
// (`deliveryos.reverse.run`). Ensures an active project, writes the analysis
// brief, and launches the agent with the command pre-typed. The inferred PRD
// is picked up by the ReverseWatcher wired in extension.ts.

import * as vscode from 'vscode';
import { CONTEXT_KEYS } from '../contextKeys';
import type { MemoryStore } from '../memory/MemoryStore';
import { type IProjectRegistry, intentToRecord } from '../projectRegistry';
import { getProfile } from '../profiles';
import { buildReverseAnalysisBrief } from '../reverse/analysisPromptBuilder';
import { launchReverseTerminal } from '../reverse/reverseLauncher';
import { REVERSE_PRD } from '../reverse/paths';
import { ReverseWriter } from '../reverse/reverseWriter';

export interface ReverseRunDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
  readonly workspace: vscode.WorkspaceFolder;
}

export function registerOpenReverse(deps: ReverseRunDeps): vscode.Disposable {
  const { registry, memoryStore, workspace } = deps;
  const writer = new ReverseWriter(workspace);

  return vscode.commands.registerCommand('deliveryos.reverse.run', async () => {
    try {
      // 1. Ensure an active project (intent) to attach the inferred PRD to.
      let active = registry.getActive();
      if (!active) {
        const title = await deriveProjectTitle(workspace);
        const intent = await memoryStore.createIntent(
          `Reverse-engineered from existing codebase at ${workspace.name}`,
          title,
        );
        registry.setActive(intentToRecord(intent));
        await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.hasProject, true);
        active = registry.getActive();
      }
      const projectTitle = active?.name ?? workspace.name;

      // 2. Write the analysis brief.
      const brief = buildReverseAnalysisBrief({
        projectTitle,
        workspacePath: workspace.uri.fsPath,
        outputPath: REVERSE_PRD,
      });
      await writer.write(brief);

      // 3. Launch the agent (Claude Code) with the command pre-typed (not run).
      launchReverseTerminal(getProfile('claude-code'), workspace);

      void vscode.window.showInformationMessage(
        'DeliveryOS Reverse: analysis brief written. Press Enter in the terminal to let ' +
          'Claude Code read the repo and derive the PRD — it will be captured automatically.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`DeliveryOS reverse failed: ${message}`);
    }
  });
}

/** Prefer package.json `name`; fall back to the workspace folder name. */
async function deriveProjectTitle(workspace: vscode.WorkspaceFolder): Promise<string> {
  try {
    const pkgUri = vscode.Uri.joinPath(workspace.uri, 'package.json');
    const bytes = await vscode.workspace.fs.readFile(pkgUri);
    const pkg = JSON.parse(new TextDecoder().decode(bytes)) as { name?: string };
    if (pkg.name && pkg.name.trim().length > 0) return pkg.name.trim();
  } catch {
    // no package.json / unreadable — fall through to folder name
  }
  return workspace.name;
}
