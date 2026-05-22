import * as vscode from 'vscode';
import { CONTEXT_KEYS } from '../contextKeys';
import type { MemoryStore } from '../memory/MemoryStore';
import { readmePath } from '../memory/paths';
import { renderDeliveryosReadme } from '../memory/readmeTemplate';
import {
  IProjectRegistry,
  ProjectRecord,
  generateProjectId,
} from '../projectRegistry';

export interface ProjectCreateArgs {
  name?: string;
  description?: string;
}

export type ProjectCreateResult =
  | { ok: true; record: ProjectRecord }
  | { ok: false; reason: 'cancelled' };

export interface ProjectCreateDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore?: MemoryStore;
  readonly workspaceUri?: vscode.Uri;
}

export function registerProjectCreate(deps: ProjectCreateDeps): vscode.Disposable {
  const { registry, memoryStore, workspaceUri } = deps;

  return vscode.commands.registerCommand(
    'deliveryos.project.create',
    async (args?: ProjectCreateArgs): Promise<ProjectCreateResult> => {
      const name =
        args?.name ??
        (await vscode.window.showInputBox({
          prompt: 'Name your DeliveryOS project',
          placeHolder: 'e.g. Bug Triage Assistant',
          ignoreFocusOut: true,
          validateInput: (v) =>
            v.trim().length === 0 ? 'Name is required' : undefined,
        }));
      if (!name) {
        return { ok: false, reason: 'cancelled' };
      }
      const trimmedName = name.trim();

      let record: ProjectRecord;

      if (memoryStore && workspaceUri) {
        const intent = await memoryStore.createIntent(trimmedName, trimmedName);
        record = {
          id: intent.id,
          name: intent.title,
          createdAt: intent.createdAt,
          ...(args?.description !== undefined && {
            description: args.description,
          }),
        };
        await ensureReadme(workspaceUri, trimmedName);
      } else {
        record = {
          id: generateProjectId(),
          name: trimmedName,
          createdAt: Date.now(),
          ...(args?.description !== undefined && {
            description: args.description,
          }),
        };
      }

      registry.setActive(record);
      await vscode.commands.executeCommand(
        'setContext',
        CONTEXT_KEYS.hasProject,
        true,
      );
      return { ok: true, record };
    },
  );
}

async function ensureReadme(
  workspaceUri: vscode.Uri,
  projectName: string,
): Promise<void> {
  const uri = readmePath(workspaceUri);
  try {
    await vscode.workspace.fs.stat(uri);
    return;
  } catch (err) {
    if (!(err instanceof vscode.FileSystemError && err.code === 'FileNotFound')) {
      throw err;
    }
  }
  const bytes = new TextEncoder().encode(renderDeliveryosReadme(projectName));
  await vscode.workspace.fs.writeFile(uri, bytes);
}
