import * as vscode from 'vscode';
import { CONTEXT_KEYS } from '../contextKeys';
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

export function registerProjectCreate(
  registry: IProjectRegistry,
): vscode.Disposable {
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

      const record: ProjectRecord = {
        id: generateProjectId(),
        name: name.trim(),
        description: args?.description,
        createdAt: Date.now(),
      };
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
