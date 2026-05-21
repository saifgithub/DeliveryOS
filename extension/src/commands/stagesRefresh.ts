import * as vscode from 'vscode';
import { StageTreeProvider } from '../tree/stageTreeProvider';

export function registerStagesRefresh(
  provider: StageTreeProvider,
): vscode.Disposable {
  return vscode.commands.registerCommand('deliveryos.stages.refresh', () => {
    provider.refresh();
  });
}
